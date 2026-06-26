# OpenAkita 网站数据分析指南

> 本文档面向 AI 助手。当用户要求分析网站数据、生成报表或绘制趋势图时，请按此文档操作。

## 1. 数据存储位置

所有数据存储在阿里云 OSS Bucket `openakita-dist` 中：


| 路径                                      | 说明                   |
| --------------------------------------- | -------------------- |
| `analytics/events/YYYY/MM/DD/*.json`    | 原始事件文件，每个 JSON 是一条事件 |
| `analytics/stats/latest.json`           | 最新聚合统计（由定时云函数生成）     |
| `analytics/stats/all_time.json`         | 累计统计（由聚合函数增量更新）       |
| `analytics/stats/all_time_state.json`   | 累计统计内部状态（不要作为报表读取）   |
| `analytics/stats/daily/YYYY-MM-DD.json` | 每日统计快照               |


## 2. 原始事件结构

每个事件 JSON 文件包含以下字段：

```json
{
  "e": "pv",                          // 事件类型
  "p": "/download/",                   // 页面路径
  "r": "https://github.com/...",       // 来源页面 (referrer)
  "l": "zh-CN",                        // 浏览器语言偏好
  "s": "1920x1080",                    // 屏幕分辨率
  "sid": "a1b2c3d4e1710000000",        // 会话 ID（单次访问唯一）
  "rv": false,                         // 是否回访用户
  "ep": "/",                           // 入口页面（本次会话第一个页面）
  "utm": {                             // UTM 来源标记（可选）
    "utm_source": "github",
    "utm_medium": "readme"
  },
  "d": { ... },                        // 事件附加数据（见下方各事件类型）
  "ip": "a1b2c3d4e5f67890",            // IP 哈希（SHA256 前 16 位，已脱敏）
  "ua": {                              // User-Agent 解析结果
    "os": "Windows",                   // 操作系统: Windows/macOS/Linux/Android/iOS/Other
    "browser": "Chrome",               // 浏览器: Chrome/Firefox/Safari/Edge/Other
    "device": "desktop"                // 设备类型: desktop/mobile/tablet
  },
  "ts": "2026-03-16T14:30:00Z"         // 服务端 UTC 时间戳
}
```

### 事件类型 (e 字段)


| 类型       | 含义         | d 字段内容                                                                               |
| -------- | ---------- | ------------------------------------------------------------------------------------ |
| `pv`     | 页面浏览       | 无                                                                                    |
| `dl`     | 下载点击       | `{"version":"1.26.0","channel":"release","platform":"windows","filename":"xxx.exe"}` |
| `scroll` | 滚动深度里程碑    | `{"depth": 25}` — 值为 25/50/75/100                                                    |
| `leave`  | 离开页面       | `{"dur": 45}` — 停留秒数                                                                 |
| `out`    | 外链点击       | `{"url":"https://github.com/..."}`                                                   |
| `lang`   | 语言切换       | `{"to":"en"}`                                                                        |
| `tab`    | 下载页 Tab 切换 | `{"tab":"cli"}`                                                                      |
| `plat`   | 下载页平台切换    | `{"platform":"macos"}`                                                               |


## 3. 聚合统计结构 (latest.json)

`analytics/stats/latest.json` 由聚合函数定时生成，结构如下：

```json
{
  "generated_at": "2026-03-16T15:00:00Z",
  "period_days": 90,
  "overview": {
    "total_pv": 18520,
    "total_uv": 4380,
    "total_sessions": 5200,
    "total_downloads": 2860,
    "avg_session_duration": 42.5,
    "median_session_duration": 28
  },
  "downloads": {
    "total": 2860,
    "by_version": {
      "1.26.0": {"total": 523, "windows": 340, "macos": 105, "linux": 62, "android": 16},
      "1.25.11": {"total": 312, "windows": 198, "macos": 72, "linux": 42}
    },
    "by_platform": {"windows": 1860, "macos": 574, "linux": 350, "android": 76},
    "by_channel": {"release": 2288, "pre-release": 429, "dev": 143}
  },
  "pages": {
    "/": {"pv": 6200, "uv": 2100},
    "/download/": {"pv": 4800, "uv": 1650},
    "/tutorials/": {"pv": 2300, "uv": 890}
  },
  "daily": {
    "2026-03-01": {"pv": 280, "uv": 95, "dl": 42},
    "2026-03-02": {"pv": 310, "uv": 102, "dl": 38}
  },
  "referrers": {
    "github.com": 3200,
    "google.com": 1800,
    "baidu.com": 950,
    "(direct)": 5400
  },
  "languages": {"zh-CN": 8500, "en-US": 4200, "ja": 1800, "ko": 1200},
  "devices": {"desktop": 14200, "mobile": 3800, "tablet": 520},
  "os": {"Windows": 9800, "macOS": 4200, "Linux": 2100, "Android": 1500, "iOS": 920},
  "browsers": {"Chrome": 11000, "Safari": 3200, "Firefox": 1800, "Edge": 2520},
  "scroll_depths": {"25": 12000, "50": 8500, "75": 5200, "100": 3100},
  "session_duration": {"avg": 42.5, "median": 28, "samples": 14200},
  "outbound_clicks": {
    "https://github.com/openakita/openakita": 2800,
    "https://discord.gg/vFwxNVNH": 450,
    "https://gitee.com/openakita/openakita": 380
  },
  "lang_switches": {"en": 1200, "ja": 800, "ko": 450, "ru": 200, "fr": 180, "de": 150},
  "entry_pages": {"/": 8500, "/download/": 3200, "/tutorials/": 1800},
  "utm_sources": {"github": 3200, "twitter": 800, "wechat": 500}
}
```

### 3.1 累计统计结构 (all_time.json)

`analytics/stats/all_time.json` 与 `latest.json` 的主体结构一致，但表示从历史第一条事件到当前的累计统计，并额外包含：

```json
{
  "scope": "all_time",
  "period_days": null,
  "processed_events": 123456,
  "last_event_key": "analytics/events/2026/06/26/1719390000000_abcd1234.json",
  "last_error_key": ""
}
```

累计统计通过 `analytics/stats/all_time_state.json` 做增量更新。首次运行会扫描全部历史事件；之后每次只读取 `last_event_key` 之后的新事件。`all_time_state.json` 保存累计 UV/session 去重所需的二次哈希标识、页面 UV 集合、每日 UV 集合和聚合计数，属于内部状态文件，报表和前端只应读取 `all_time.json`。

## 4. 常用分析任务

当用户要求分析数据时，请按以下模式操作。

### 4.1 读取数据

**方式 A：读取聚合文件（推荐，最快）**

从 OSS 下载 `analytics/stats/latest.json`，内容已是结构化 JSON。

**方式 B：读取原始事件（需要自定义分析时）**

从 OSS 列出并下载 `analytics/events/YYYY/MM/DD/*.json`，逐个解析。

### 4.2 日常报表

用户可能会说："帮我看看最近的网站数据" 或 "出一份周报/月报"

**报告结构：**

1. **概览**：总 PV、UV、下载量，与上期对比增减百分比
2. **下载统计**：各版本下载量排名，各平台占比
3. **流量来源**：直接访问 / 搜索引擎 / GitHub / 其他
4. **热门页面**：按 PV 排序的 Top 10
5. **用户画像**：设备类型、操作系统、语言分布
6. **趋势观察**：PV/UV/下载量日趋势，标注异常波动

### 4.3 绘制趋势图

用户可能会说："画一个最近 30 天的趋势图"

使用 Python + matplotlib：

```python
import json
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime

# 读取 latest.json（用户提供或从 OSS 下载）
with open("latest.json", "r", encoding="utf-8") as f:
    stats = json.load(f)

daily = stats["daily"]
dates = [datetime.strptime(d, "%Y-%m-%d") for d in sorted(daily.keys())]
pvs = [daily[d.strftime("%Y-%m-%d")]["pv"] for d in dates]
uvs = [daily[d.strftime("%Y-%m-%d")]["uv"] for d in dates]
dls = [daily[d.strftime("%Y-%m-%d")]["dl"] for d in dates]

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 8), sharex=True)
fig.suptitle("OpenAkita 网站数据趋势", fontsize=16, fontweight="bold")

# PV / UV 趋势
ax1.plot(dates, pvs, label="PV (页面浏览)", color="#4F46E5", linewidth=2)
ax1.plot(dates, uvs, label="UV (独立访客)", color="#10B981", linewidth=2)
ax1.fill_between(dates, pvs, alpha=0.1, color="#4F46E5")
ax1.fill_between(dates, uvs, alpha=0.1, color="#10B981")
ax1.set_ylabel("次数")
ax1.legend()
ax1.grid(True, alpha=0.3)

# 下载趋势
ax2.bar(dates, dls, color="#F59E0B", alpha=0.8, label="下载次数")
ax2.set_ylabel("下载次数")
ax2.set_xlabel("日期")
ax2.legend()
ax2.grid(True, alpha=0.3)

ax2.xaxis.set_major_formatter(mdates.DateFormatter("%m-%d"))
ax2.xaxis.set_major_locator(mdates.WeekdayLocator(interval=1))
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig("trend.png", dpi=150, bbox_inches="tight")
plt.show()
```

### 4.4 下载量分析

```python
# 各版本下载量柱状图
versions = stats["downloads"]["by_version"]
ver_names = sorted(versions.keys(), key=lambda v: list(map(int, v.split("."))), reverse=True)[:10]
ver_totals = [versions[v]["total"] for v in ver_names]

fig, ax = plt.subplots(figsize=(12, 6))
bars = ax.barh(ver_names, ver_totals, color="#4F46E5")
ax.set_xlabel("下载次数")
ax.set_title("各版本下载量 Top 10")
for bar, val in zip(bars, ver_totals):
    ax.text(bar.get_width() + 5, bar.get_y() + bar.get_height()/2, str(val), va="center")
plt.tight_layout()
plt.savefig("downloads_by_version.png", dpi=150)
```

```python
# 各平台下载占比饼图
platforms = stats["downloads"]["by_platform"]
labels = list(platforms.keys())
sizes = list(platforms.values())
colors = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]

fig, ax = plt.subplots(figsize=(8, 8))
ax.pie(sizes, labels=labels, colors=colors[:len(labels)], autopct="%1.1f%%", startangle=90)
ax.set_title("各平台下载占比")
plt.savefig("downloads_by_platform.png", dpi=150)
```

### 4.5 流量来源分析

```python
refs = stats["referrers"]
ref_names = list(refs.keys())[:10]
ref_vals = [refs[k] for k in ref_names]

fig, ax = plt.subplots(figsize=(10, 6))
ax.barh(ref_names[::-1], ref_vals[::-1], color="#10B981")
ax.set_xlabel("访问次数")
ax.set_title("Top 10 流量来源")
plt.tight_layout()
plt.savefig("referrers.png", dpi=150)
```

### 4.6 用户留存与参与度

```python
# 滚动深度漏斗
depths = stats["scroll_depths"]
milestones = ["25", "50", "75", "100"]
counts = [depths.get(m, 0) for m in milestones]
total_pv = stats["overview"]["total_pv"]

fig, ax = plt.subplots(figsize=(8, 5))
bars = ax.bar(["25%", "50%", "75%", "100%"], counts, color=["#4F46E5", "#7C3AED", "#DB2777", "#EF4444"])
ax.set_ylabel("用户数")
ax.set_xlabel("滚动深度")
ax.set_title("页面滚动深度漏斗")
for bar, val in zip(bars, counts):
    pct = round(val / total_pv * 100, 1) if total_pv else 0
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 50, f"{pct}%", ha="center")
plt.tight_layout()
plt.savefig("scroll_funnel.png", dpi=150)
```

### 4.7 自定义原始事件分析

当聚合数据不够用时（例如用户要求 "分析某天某小时的下载量"），需要读取原始事件文件：

```python
import json
import os
from collections import defaultdict

# 假设已将 analytics/events/2026/03/16/ 目录下载到本地 events_dir
events_dir = "./events/2026/03/16/"
events = []
for fname in os.listdir(events_dir):
    if fname.endswith(".json"):
        with open(os.path.join(events_dir, fname), "r", encoding="utf-8") as f:
            events.append(json.load(f))

# 按小时统计下载量
hourly_dl = defaultdict(int)
for ev in events:
    if ev["e"] == "dl":
        hour = ev["ts"][11:13]  # 提取 HH
        hourly_dl[hour] += 1

for h in sorted(hourly_dl.keys()):
    print(f"{h}:00 - {hourly_dl[h]} 次下载")
```

## 5. 分析维度速查表


| 用户问题                  | 数据来源                             | 关键字段             |
| --------------------- | -------------------------------- | ---------------- |
| "有多少人访问了网站"           | overview.total_uv                | ip 哈希去重          |
| "每天多少访问量"             | daily.{date}.pv / uv             | 日级趋势             |
| "某版本下载了多少次"           | downloads.by_version.{ver}.total | dl 事件            |
| "Windows 和 Mac 哪个下载多" | downloads.by_platform            | dl 事件的 platform  |
| "用户从哪来的"              | referrers                        | pv 事件的 r 字段      |
| "哪个页面最热门"             | pages                            | pv 事件的 p 字段      |
| "用户看了多久"              | session_duration.avg / median    | leave 事件的 dur    |
| "页面内容有没有看完"           | scroll_depths                    | scroll 事件的 depth |
| "多语言有人用吗"             | lang_switches                    | lang 事件的 to      |
| "推广链接有效果吗"            | utm_sources                      | pv 事件的 utm       |
| "用户设备分布"              | devices / os / browsers          | pv 事件的 ua        |
| "哪个外链被点得多"            | outbound_clicks                  | out 事件的 url      |
| "新用户多还是老用户多"          | 原始事件的 rv 字段                      | rv=true 为回访      |
| "用户从哪个页面进来的"          | entry_pages                      | pv 事件的 ep 字段     |


## 6. 数据注意事项

1. **UV 统计**基于 IP 哈希去重，同一公司/学校内网用户共享 IP 会被算作 1 个 UV
2. **下载次数**统计的是点击行为，不代表实际完成下载（用户可能取消）
3. **session_duration** 基于页面可见性变化事件，用户切换标签页时触发
4. **scroll_depth** 只记录里程碑（25/50/75/100），不记录精确百分比
5. **referrer** 可能为空（直接输入 URL、书签、部分浏览器隐私模式）
6. **utm 参数**只在 URL 中带了 `?utm_source=xxx` 时才有值
7. 所有时间戳为 **UTC 时区**，分析时需要考虑北京时间 = UTC+8
8. **tracker.js 中 ENDPOINT 为空时**，所有追踪功能静默禁用，不会产生任何请求

## 7. 云函数部署说明（阿里云函数计算 FC 3.0）

需要创建 **2 个函数**，类型不同：

### 7.1 追踪函数 — Web 函数 (track.py)

> 函数类型：**Web 函数**（自定义运行时），接收前端 HTTP 请求

**创建步骤：**

1. 登录 [阿里云函数计算控制台](https://fcnext.console.aliyun.com/)
2. 点击 **创建函数** → 选择 **Web 函数**
3. 基础配置：
  - 函数名称：`openakita-analytics-track`
  - 运行时：**Python 3.10**（自定义运行时）
  - 请求处理程序类型：**处理 HTTP 请求**
  - 启动命令：`python3 track.py`
  - 监听端口：`9000`
4. 代码上传：
  - 将 `analytics/track.py` 和 `analytics/requirements.txt` 打成 ZIP 上传
  - 或直接在控制台在线编辑粘贴代码
5. 环境变量（函数配置 → 环境变量）：

  | 变量名            | 值                                      | 说明              |
  | -------------- | -------------------------------------- | --------------- |
  | `OSS_ENDPOINT` | `https://oss-cn-hangzhou.aliyuncs.com` | 你的 OSS 所在地域     |
  | `OSS_BUCKET`   | `openakita-dist`                       | 你的 Bucket 名称    |
  | `OSS_AK`       | 你的 AccessKey ID                        | 阿里云 AK          |
  | `OSS_SK`       | 你的 AccessKey Secret                    | 阿里云 SK（注意保密）    |
  | `IP_SALT`      | 随机字符串（如 `a8f3k2x9p1`）                  | 用于 IP 哈希脱敏，务必保密 |

6. 触发器配置：
  - 系统自动创建 **HTTP 触发器**（Web 函数默认自带）
  - 认证方式：选择 **无需认证**
  - 记下公网访问 URL（形如 `https://xxx.cn-hangzhou.fcapp.run`）
7. **将公网 URL 填入** `assets/js/tracker.js` 第 16 行：
  ```javascript
   var ENDPOINT = "https://xxx.cn-hangzhou.fcapp.run/track";
  ```

**测试：** 在控制台的「测试函数」中发送 POST 请求到 `/track`，Body 为：

```json
{"e":"pv","p":"/test/","l":"zh-CN","s":"1920x1080","sid":"test123","rv":false}
```

返回 `{"ok":true}` 即成功。检查 OSS 的 `analytics/events/` 目录应有新 JSON 文件。

### 7.2 聚合函数 — 事件函数 (aggregate.py)

> 函数类型：**事件函数**（内置运行时），由定时器定期触发

**创建步骤：**

1. 点击 **创建函数** → 选择 **事件函数**
2. 基础配置：
  - 函数名称：`openakita-analytics-aggregate`
  - 运行时：**Python 3.10**（内置运行时）
  - 请求处理程序（Handler）：`aggregate.handler`
  - 函数代码：上传 `analytics/aggregate.py`
3. 环境变量（函数配置 → 环境变量）：

  | 变量名            | 值                                                                                              | 说明                |
  | -------------- | ---------------------------------------------------------------------------------------------- | ----------------- |
  | `OSS_ENDPOINT` | [https://oss-cn-hangzhou-internal.aliyuncs.com](https://oss-cn-hangzhou-internal.aliyuncs.com) | 你的 OSS 所在地域       |
  | `OSS_BUCKET`   | `openakita-dist`                                                                               | 你的 Bucket 名称      |
  | `OSS_AK`       | 你的 AccessKey ID                                                                                | 阿里云 AK            |
  | `OSS_SK`       | 你的 AccessKey Secret                                                                            | 阿里云 SK（注意保密）      |
  | `STATS_DAYS`   | `90`                                                                                           | 聚合最近多少天的数据（默认 90） |
  | `ANALYTICS_STATE_SALT` | 随机长字符串                                                                                     | 可选，累计状态中 visitor/session 二次哈希用 |

  > ⚠️ 前 4 项（OSS 配置）必须与追踪函数 (track.py) 保持一致，缺少任何一项都会导致 `TypeError: can only concatenate str (not "NoneType") to str` 错误。`IP_SALT` 仅 track.py 使用，此处无需配置。
4. 创建 **定时触发器**：
  - 触发器类型：**定时触发器**
  - 触发间隔：Cron 表达式 `0 0 * * `* *（每小时执行一次）
  - 或 `0 0 2 * * `*（每天凌晨 2 点执行一次，流量小推荐这个）
5. 资源配置建议：
  - 内存：512 MB（需要读取大量小文件）
  - 超时时间：300 秒（5 分钟，数据量大时需要更长）

**执行结果：** 聚合完成后，OSS 中会生成：

- `analytics/stats/latest.json` — 最新聚合结果（前端可直接 fetch）
- `analytics/stats/all_time.json` — 累计聚合结果（前端或报表可直接 fetch）
- `analytics/stats/all_time_state.json` — 累计聚合内部状态（不要公开使用）
- `analytics/stats/daily/YYYY-MM-DD.json` — 当日快照

### 7.3 依赖说明


| 函数                 | 依赖              | 说明                                        |
| ------------------ | --------------- | ----------------------------------------- |
| track.py（Web 函数）   | `flask`, `oss2` | Flask 需打包在 ZIP 中或通过 `requirements.txt` 安装 |
| aggregate.py（事件函数） | `oss2`          | FC 内置运行时已预装 oss2，通常无需额外安装                 |


**打包 track.py 的 ZIP：**

```bash
pip install flask oss2 -t ./package
cp track.py ./package/
cd package && zip -r ../track.zip .
```

将 `track.zip` 上传到函数计算即可。

### 7.4 资源与性能配置

#### 追踪函数 (track.py) — 轻量高频

每次请求只做：接收 < 300B JSON → 解析 → 写一个小文件到 OSS，耗时 < 100ms。


| 配置项        | 推荐值                | 说明                           |
| ---------- | ------------------ | ---------------------------- |
| **实例类型**   | 弹性实例               | 按量付费，无请求时不计费                 |
| **vCPU**   | 0.05               | 极轻量计算，最低即可                   |
| **内存**     | 128 MB             | Flask + oss2 内存占用很小          |
| **磁盘**     | 512 MB             | 默认值即可                        |
| **最小实例数**  | 0                  | 无流量时缩到 0，零成本待机               |
| **单实例并发度** | 20                 | 每个实例同时处理 20 个请求              |
| **执行超时时间** | 10 秒               | 正常请求 < 1 秒，留余量防止 OSS 偶尔慢     |
| **启动命令**   | `python3 track.py` | Flask 监听 9000 端口             |
| **监听端口**   | 9000               | 与代码中 `app.run(port=9000)` 一致 |


> **冷启动说明**：最小实例为 0 时，首次请求有 1-3 秒冷启动延迟。
> 但 tracker.js 使用 `sendBeacon` 异步发送，用户完全无感知。
> 如果希望消除冷启动，可将最小实例设为 1（会产生持续计费约 ¥3-5/月）。

#### 聚合函数 (aggregate.py) — 低频重计算

每次执行需要：

- 最近窗口统计：列出 N 天的事件文件 → 逐个读取 → 内存聚合 → 写入 `latest.json`
- 累计统计：首次列出并读取全部历史事件；之后只读取 `all_time_state.json` 记录的 `last_event_key` 之后的新事件 → 更新 `all_time.json`


| 配置项         | 推荐值                 | 说明                 |
| ----------- | ------------------- | ------------------ |
| **实例类型**    | 弹性实例                | 定时触发，按量付费          |
| **vCPU**    | 0.35                | 需要一定计算力做聚合         |
| **内存**      | 512 MB              | 需要在内存中加载所有事件记录     |
| **磁盘**      | 512 MB              | 默认值即可              |
| **最小实例数**   | 0                   | 每天只跑 1-2 次，不需要常驻   |
| **单实例并发度**  | 1                   | 定时任务，一次只跑一个        |
| **执行超时时间**  | 300 秒               | 数据量大时读 OSS 较慢，留足余量 |
| **Handler** | `aggregate.handler` | 事件函数入口             |


> **内存估算**：最近窗口统计已改为边读边聚合，不再把 90 天事件全部放入列表。累计统计会在 `all_time_state.json` 中保存 UV/session 去重集合，状态大小会随独立访客数、会话数、页面数和每日 UV 增长。当前小流量下 512 MB 足够；如果累计 UV/session 达到百万级，建议将内存提升至 1024 MB，并考虑把累计去重改为数据库或近似去重结构。

#### 费用估算（按当前流量）

以月均 10,000 PV + 3,000 下载 ≈ 13,000 次请求计算：


| 项目           | 用量                      | 免费额度        | 实际费用   |
| ------------ | ----------------------- | ----------- | ------ |
| 追踪函数调用次数     | ~13,000 次/月             | 100 万次/月    | ¥0     |
| 追踪函数执行时长     | ~0.05s × 13,000 × 128MB | 40 万 GB·秒/月 | ¥0     |
| 聚合函数调用次数     | 24 次/月（每天 1 次）          | 100 万次/月    | ¥0     |
| 聚合函数执行时长     | ~30s × 24 × 512MB       | 40 万 GB·秒/月 | ¥0     |
| OSS 存储（事件文件） | ~6.5 MB/月               | 已有 Bucket   | 几乎可忽略  |
| **总计**       |                         |             | **¥0** |


### 7.5 函数类型速查


|             | 追踪函数 (track.py)     | 聚合函数 (aggregate.py) |
| ----------- | ------------------- | ------------------- |
| **函数类型**    | Web 函数              | 事件函数                |
| **运行时**     | Python 3.10（自定义运行时） | Python 3.10（内置运行时）  |
| **vCPU**    | 0.05                | 0.35                |
| **内存**      | 128 MB              | 512 MB              |
| **超时**      | 10 秒                | 300 秒               |
| **最小实例**    | 0                   | 0                   |
| **并发度**     | 20                  | 1                   |
| **触发器**     | HTTP 触发器（自动创建）      | 定时触发器（手动配置）         |
| **Handler** | 不需要（Flask 监听 9000）  | `aggregate.handler` |
| **启动命令**    | `python3 track.py`  | 不需要                 |
| **公网访问**    | 是（前端需要调用）           | 否（内部定时触发）           |
| **认证**      | 无需认证                | 不适用                 |
