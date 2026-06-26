"""
OpenAkita Analytics — Aggregate Function
阿里云函数计算 FC 3.0 — 事件函数（内置运行时 Python）

读取 OSS 中的原始事件文件，聚合生成统计 JSON。

────────────────────────────────
函数类型:    事件函数
运行时:      Python 3.10 (内置运行时)
处理程序:    aggregate.handler
触发器:      定时触发器（Cron: 0 0 * * * * 每小时一次）
认证方式:    不适用（内部触发）
────────────────────────────────

环境变量:
  OSS_ENDPOINT  — e.g. "https://oss-cn-hangzhou.aliyuncs.com"
  OSS_BUCKET    — e.g. "openakita-dist"
  OSS_AK        — AccessKey ID
  OSS_SK        — AccessKey Secret
  STATS_DAYS    — 聚合天数，默认 90

输出:
  analytics/stats/latest.json          — 最近 STATS_DAYS 天统计
  analytics/stats/daily/YYYY-MM-DD.json — 每日统计快照
  analytics/stats/all_time.json        — 累计统计
  analytics/stats/all_time_state.json  — 累计统计的内部增量状态
"""

import json
import os
import hashlib
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import oss2

OSS_ENDPOINT = os.environ.get("OSS_ENDPOINT", "")
OSS_BUCKET = os.environ.get("OSS_BUCKET", "")
OSS_AK = os.environ.get("OSS_AK", "")
OSS_SK = os.environ.get("OSS_SK", "")
STATS_DAYS = int(os.environ.get("STATS_DAYS", "90"))
STATE_SALT = os.environ.get("ANALYTICS_STATE_SALT", OSS_SK or "openakita-analytics-state")
EVENTS_PREFIX = "analytics/events/"
LATEST_STATS_KEY = "analytics/stats/latest.json"
ALL_TIME_STATS_KEY = "analytics/stats/all_time.json"
ALL_TIME_STATE_KEY = "analytics/stats/all_time_state.json"
ALL_TIME_STATE_VERSION = 1

_bucket = None


def get_bucket():
    global _bucket
    if _bucket is None:
        auth = oss2.Auth(OSS_AK, OSS_SK)
        _bucket = oss2.Bucket(auth, OSS_ENDPOINT, OSS_BUCKET)
    return _bucket


def list_event_files(bucket, date_str):
    parts = date_str.split("-")
    prefix = "{}{}/{}/{}/".format(EVENTS_PREFIX, parts[0], parts[1], parts[2])
    files = []
    for obj in oss2.ObjectIterator(bucket, prefix=prefix):
        if obj.key.endswith(".json"):
            files.append(obj.key)
    return files


def iter_event_files(bucket, marker=""):
    for obj in oss2.ObjectIterator(bucket, prefix=EVENTS_PREFIX, marker=marker):
        if obj.key.endswith(".json"):
            yield obj.key


def read_event(bucket, key):
    try:
        return json.loads(bucket.get_object(key).read().decode("utf-8"))
    except Exception:
        return None


def read_json_object(bucket, key):
    try:
        return json.loads(bucket.get_object(key).read().decode("utf-8"))
    except Exception:
        return None


def put_json_object(bucket, key, data, pretty=True):
    if pretty:
        payload = json.dumps(data, ensure_ascii=False, indent=2)
    else:
        payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    bucket.put_object(key, payload.encode("utf-8"))


def utc_now_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def anonymize_identifier(value):
    return hashlib.sha256("{}:{}".format(STATE_SALT, value or "").encode("utf-8")).hexdigest()[:24]


def new_accumulator():
    return {
        "total_pv": 0,
        "ip_set": set(),
        "session_set": set(),
        "pages": defaultdict(lambda: {"pv": 0, "ips": set()}),
        "downloads": {
            "total": 0,
            "by_version": defaultdict(lambda: defaultdict(int)),
            "by_platform": defaultdict(int),
            "by_channel": defaultdict(int),
            "by_file": defaultdict(int),
        },
        "daily": defaultdict(lambda: {"pv": 0, "uv": set(), "dl": 0}),
        "referrers": defaultdict(int),
        "languages": defaultdict(int),
        "devices": {"desktop": 0, "mobile": 0, "tablet": 0},
        "os_stats": defaultdict(int),
        "browsers": defaultdict(int),
        "scroll_depths": defaultdict(int),
        "duration_count": 0,
        "duration_total": 0,
        "duration_bins": defaultdict(int),
        "outbound": defaultdict(int),
        "lang_switches": defaultdict(int),
        "entry_pages": defaultdict(int),
        "utm_sources": defaultdict(int),
    }


def add_event(acc, ev):
    if not ev or not isinstance(ev, dict):
        return False

    et = ev.get("e", "")
    visitor_id = anonymize_identifier(ev.get("ip", ""))
    session_id = anonymize_identifier(ev.get("sid", ""))
    page = ev.get("p", "/")
    ts = ev.get("ts", "")
    day = ts[:10] if ts else ""
    ua_info = ev.get("ua") or {}
    downloads = acc["downloads"]

    if et == "pv":
        acc["total_pv"] += 1
        acc["ip_set"].add(visitor_id)
        acc["session_set"].add(session_id)
        acc["pages"][page]["pv"] += 1
        acc["pages"][page]["ips"].add(visitor_id)

        if day:
            acc["daily"][day]["pv"] += 1
            acc["daily"][day]["uv"].add(visitor_id)

        ref = ev.get("r", "")
        if ref:
            try:
                from urllib.parse import urlparse
                acc["referrers"][urlparse(ref).hostname or ref] += 1
            except Exception:
                acc["referrers"][ref[:60]] += 1

        acc["languages"][ev.get("l", "unknown")[:10]] += 1
        device = ua_info.get("device", "desktop")
        if device in acc["devices"]:
            acc["devices"][device] += 1
        acc["os_stats"][ua_info.get("os", "Other")] += 1
        acc["browsers"][ua_info.get("browser", "Other")] += 1
        acc["entry_pages"][ev.get("ep", page)] += 1

        utm = ev.get("utm")
        if utm and isinstance(utm, dict) and utm.get("utm_source"):
            acc["utm_sources"][utm["utm_source"]] += 1

    elif et == "dl":
        d = ev.get("d") or {}
        ver = d.get("version", "unknown")
        plat = d.get("platform", "unknown")
        ch = d.get("channel", "unknown")
        fname = d.get("filename", "")

        downloads["total"] += 1
        downloads["by_version"][ver]["total"] = downloads["by_version"][ver].get("total", 0) + 1
        downloads["by_version"][ver][plat] = downloads["by_version"][ver].get(plat, 0) + 1
        downloads["by_platform"][plat] += 1
        downloads["by_channel"][ch] += 1
        if fname:
            downloads["by_file"][fname] += 1
        if day:
            acc["daily"][day]["dl"] += 1

    elif et == "scroll":
        d = ev.get("d") or {}
        acc["scroll_depths"][str(d.get("depth", 0))] += 1

    elif et == "leave":
        d = ev.get("d") or {}
        try:
            dur = int(d.get("dur", 0))
        except Exception:
            dur = 0
        if 0 < dur < 3600:
            acc["duration_count"] += 1
            acc["duration_total"] += dur
            acc["duration_bins"][str(dur)] += 1

    elif et == "out":
        d = ev.get("d") or {}
        url = d.get("url", "")[:100]
        if url:
            acc["outbound"][url] += 1

    elif et == "lang":
        d = ev.get("d") or {}
        if d.get("to"):
            acc["lang_switches"][d["to"]] += 1

    return True


def aggregate_events(events):
    acc = new_accumulator()
    count = 0
    for ev in events:
        if add_event(acc, ev):
            count += 1
    return finalize_accumulator(acc, STATS_DAYS), count


def aggregate_recent_stats(bucket, today):
    acc = new_accumulator()
    event_count = 0

    for i in range(STATS_DAYS):
        day = today - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        for f in list_event_files(bucket, day_str):
            ev = read_event(bucket, f)
            if ev and add_event(acc, ev):
                event_count += 1

    return finalize_accumulator(acc, STATS_DAYS), event_count


def finalize_accumulator(acc, period_days, extra=None):
    downloads = acc["downloads"]
    duration_count = acc["duration_count"]
    pages = acc["pages"]
    daily = acc["daily"]

    avg_dur = round(acc["duration_total"] / duration_count, 1) if duration_count else 0
    median_dur = median_duration(acc["duration_bins"], duration_count)

    page_stats = {}
    for p, info in sorted(pages.items(), key=lambda x: -x[1]["pv"]):
        page_stats[p] = {"pv": info["pv"], "uv": len(info["ips"])}

    daily_sorted = {}
    for d in sorted(daily.keys()):
        daily_sorted[d] = {"pv": daily[d]["pv"], "uv": len(daily[d]["uv"]), "dl": daily[d]["dl"]}

    def top_n(d, n=20):
        return dict(sorted(d.items(), key=lambda x: -x[1])[:n])

    stats = {
        "generated_at": utc_now_str(),
        "period_days": period_days,
        "overview": {
            "total_pv": acc["total_pv"],
            "total_uv": len(acc["ip_set"]),
            "total_sessions": len(acc["session_set"]),
            "total_downloads": downloads["total"],
            "avg_session_duration": avg_dur,
            "median_session_duration": median_dur,
        },
        "downloads": {
            "total": downloads["total"],
            "by_version": dict(downloads["by_version"]),
            "by_platform": dict(downloads["by_platform"]),
            "by_channel": dict(downloads["by_channel"]),
            "top_files": top_n(downloads["by_file"]),
        },
        "pages": page_stats,
        "daily": daily_sorted,
        "referrers": top_n(dict(acc["referrers"])),
        "languages": top_n(dict(acc["languages"])),
        "devices": acc["devices"],
        "os": top_n(dict(acc["os_stats"])),
        "browsers": top_n(dict(acc["browsers"])),
        "scroll_depths": dict(acc["scroll_depths"]),
        "session_duration": {"avg": avg_dur, "median": median_dur, "samples": duration_count},
        "outbound_clicks": top_n(dict(acc["outbound"])),
        "lang_switches": dict(acc["lang_switches"]),
        "entry_pages": top_n(dict(acc["entry_pages"])),
        "utm_sources": top_n(dict(acc["utm_sources"])),
    }
    if extra:
        stats.update(extra)
    return stats


def median_duration(duration_bins, duration_count):
    if not duration_count:
        return 0

    target_rank = duration_count // 2 + 1
    seen = 0
    for dur, count in sorted(duration_bins.items(), key=lambda x: int(x[0])):
        seen += count
        if seen >= target_rank:
            return int(dur)
    return 0


def to_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def int_dict(data):
    return {str(k): to_int(v) for k, v in (data or {}).items()}


def nested_int_dict(data):
    result = defaultdict(lambda: defaultdict(int))
    for key, values in (data or {}).items():
        result[str(key)].update(int_dict(values))
    return result


def accumulator_from_state(state):
    acc = new_accumulator()
    if not state or state.get("schema_version") != ALL_TIME_STATE_VERSION:
        return acc

    acc["total_pv"] = to_int(state.get("total_pv"))
    acc["ip_set"] = set(state.get("ip_set") or [])
    acc["session_set"] = set(state.get("session_set") or [])

    for page, info in (state.get("pages") or {}).items():
        acc["pages"][page]["pv"] = to_int(info.get("pv"))
        acc["pages"][page]["ips"] = set(info.get("ips") or [])

    downloads = state.get("downloads") or {}
    acc["downloads"] = {
        "total": 0,
        "by_version": nested_int_dict(downloads.get("by_version")),
        "by_platform": defaultdict(int, int_dict(downloads.get("by_platform"))),
        "by_channel": defaultdict(int, int_dict(downloads.get("by_channel"))),
        "by_file": defaultdict(int, int_dict(downloads.get("by_file"))),
    }

    acc["downloads"]["total"] = to_int(downloads.get("total"))

    for day, info in (state.get("daily") or {}).items():
        acc["daily"][day]["pv"] = to_int(info.get("pv"))
        acc["daily"][day]["uv"] = set(info.get("uv") or [])
        acc["daily"][day]["dl"] = to_int(info.get("dl"))

    acc["referrers"] = defaultdict(int, int_dict(state.get("referrers")))
    acc["languages"] = defaultdict(int, int_dict(state.get("languages")))
    acc["devices"] = {
        "desktop": to_int((state.get("devices") or {}).get("desktop")),
        "mobile": to_int((state.get("devices") or {}).get("mobile")),
        "tablet": to_int((state.get("devices") or {}).get("tablet")),
    }
    acc["os_stats"] = defaultdict(int, int_dict(state.get("os_stats")))
    acc["browsers"] = defaultdict(int, int_dict(state.get("browsers")))
    acc["scroll_depths"] = defaultdict(int, int_dict(state.get("scroll_depths")))
    acc["duration_count"] = to_int(state.get("duration_count"))
    acc["duration_total"] = to_int(state.get("duration_total"))
    acc["duration_bins"] = defaultdict(int, int_dict(state.get("duration_bins")))
    if not acc["duration_bins"] and state.get("durations"):
        for dur in state.get("durations") or []:
            try:
                dur = int(dur)
            except Exception:
                continue
            if 0 < dur < 3600:
                acc["duration_count"] += 1
                acc["duration_total"] += dur
                acc["duration_bins"][str(dur)] += 1
    acc["outbound"] = defaultdict(int, int_dict(state.get("outbound")))
    acc["lang_switches"] = defaultdict(int, int_dict(state.get("lang_switches")))
    acc["entry_pages"] = defaultdict(int, int_dict(state.get("entry_pages")))
    acc["utm_sources"] = defaultdict(int, int_dict(state.get("utm_sources")))
    return acc


def accumulator_to_state(acc, previous_state, last_event_key, processed_events, last_error_key=""):
    downloads = acc["downloads"]
    state = {
        "schema_version": ALL_TIME_STATE_VERSION,
        "updated_at": utc_now_str(),
        "last_event_key": last_event_key,
        "last_error_key": last_error_key,
        "processed_events": processed_events,
        "total_pv": acc["total_pv"],
        "ip_set": sorted(acc["ip_set"]),
        "session_set": sorted(acc["session_set"]),
        "pages": {
            page: {"pv": info["pv"], "ips": sorted(info["ips"])}
            for page, info in acc["pages"].items()
        },
        "downloads": {
            "total": downloads["total"],
            "by_version": {ver: dict(values) for ver, values in downloads["by_version"].items()},
            "by_platform": dict(downloads["by_platform"]),
            "by_channel": dict(downloads["by_channel"]),
            "by_file": dict(downloads["by_file"]),
        },
        "daily": {
            day: {"pv": info["pv"], "uv": sorted(info["uv"]), "dl": info["dl"]}
            for day, info in acc["daily"].items()
        },
        "referrers": dict(acc["referrers"]),
        "languages": dict(acc["languages"]),
        "devices": acc["devices"],
        "os_stats": dict(acc["os_stats"]),
        "browsers": dict(acc["browsers"]),
        "scroll_depths": dict(acc["scroll_depths"]),
        "duration_count": acc["duration_count"],
        "duration_total": acc["duration_total"],
        "duration_bins": dict(acc["duration_bins"]),
        "outbound": dict(acc["outbound"]),
        "lang_switches": dict(acc["lang_switches"]),
        "entry_pages": dict(acc["entry_pages"]),
        "utm_sources": dict(acc["utm_sources"]),
    }
    if previous_state and previous_state.get("created_at"):
        state["created_at"] = previous_state["created_at"]
    else:
        state["created_at"] = state["updated_at"]
    return state


def update_all_time_stats(bucket):
    state = read_json_object(bucket, ALL_TIME_STATE_KEY) or {}
    acc = accumulator_from_state(state)
    state_valid = bool(state and state.get("schema_version") == ALL_TIME_STATE_VERSION)
    last_event_key = state.get("last_event_key", "") if state_valid else ""
    processed_events = to_int(state.get("processed_events")) if state_valid else 0
    new_events = 0
    last_error_key = ""

    for key in iter_event_files(bucket, marker=last_event_key):
        ev = read_event(bucket, key)
        if ev is None:
            last_error_key = key
            break
        add_event(acc, ev)
        processed_events += 1
        new_events += 1
        last_event_key = key

    next_state = accumulator_to_state(acc, state, last_event_key, processed_events, last_error_key)
    all_time_stats = finalize_accumulator(
        acc,
        None,
        {
            "scope": "all_time",
            "processed_events": processed_events,
            "last_event_key": last_event_key,
            "last_error_key": last_error_key,
        },
    )

    # 先保存状态，避免 all_time.json 写入成功但状态未推进导致下次重复累计。
    put_json_object(bucket, ALL_TIME_STATE_KEY, next_state, pretty=False)
    put_json_object(bucket, ALL_TIME_STATS_KEY, all_time_stats)
    return new_events, processed_events


def handler(event, context):
    """事件函数入口，由定时触发器调用。"""

    bucket = get_bucket()
    today = datetime.now(timezone.utc)
    stats, recent_events = aggregate_recent_stats(bucket, today)

    put_json_object(bucket, LATEST_STATS_KEY, stats)
    put_json_object(
        bucket,
        "analytics/stats/daily/{}.json".format(today.strftime("%Y-%m-%d")),
        stats,
    )

    all_time_new_events, all_time_events = update_all_time_stats(bucket)

    return "OK: aggregated {} recent events; all-time added {} new events ({} total)".format(
        recent_events,
        all_time_new_events,
        all_time_events,
    )
