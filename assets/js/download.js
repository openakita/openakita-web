/**
 * download.js — Download page logic for OpenAkita
 *
 * Handles: data fetching, platform detection, channel rendering,
 * historical version browsing, and release notes display.
 */
(function () {
  "use strict";

  // ── Config ──
  var OSS_BASE = "https://dl-openakita.fzstack.com";
  var GH_REPO = "openakita/openakita";
  var CHANNELS = ["release", "pre-release", "dev"];
  var CHANNEL_IDS = { release: "release", "pre-release": "prerelease", dev: "dev" };

  // ── Download page i18n ──
  var DL_MSGS = {
    zh: {
      download: "下载",
      channelRelease: "稳定版",
      channelPreRelease: "抢先版",
      channelDev: "开发版",
      recommend: "推荐",
      changelog: "更新日志",
      channelUnavailable: "暂无此渠道版本",
      iosHint: "即将推出 — 敬请期待",
      noPlatformPkg: "暂无 {p} 安装包 · 查看历史版本",
      loading: "加载中...",
      noHistory: "暂无历史版本数据，请稍后再试。",
      noHistoryShort: "暂无历史版本数据。",
      noDownloadData: "暂无下载数据",
      noPlatformAny: "暂无任何平台安装包",
      noChangelog: "暂无更新日志",
      noArchPkg: "该版本暂无 {p} 安装包",
      archApple: "Apple（M系列）芯片版",
      archIntel: "Intel 芯片版",
      viewAllArch: "查看全部架构",
      downloadOptions: "下载选项",
      historyVersions: "历史版本",
      historyHint: "点击展开加载历史版本...",
      descRelease: "推荐日常使用。经过充分测试，基本无 bug，适合追求稳定体验的用户。",
      descPreRelease: "抢先体验新功能。包含最新已完成的功能特性，可能存在少量 bug，适合愿意尝鲜的用户。",
      descDev: "最新开发版本。包含正在开发中的功能，存在较多 bug，仅建议开发者或高级用户使用。",
      sourceInstall: "源码安装",
      dockerInstall: "Docker",
      dockerTitle: "Docker 安装",
      dockerDesc: "适合 Server 容器化部署，克隆项目、配置 API Key 后一键构建启动。",
      dockerReqTitle: "系统要求",
      dockerTutorial: "查看完整 Docker 教程",
      reqItem: "项目",
      reqDesc: "说明",
      reqOs: "系统",
      reqPerm: "权限",
      reqDocker: "容器运行时",
      reqApi: "API Key",
      reqDisk: "磁盘",
      reqDiskVal: "推荐 20 GB 及以上",
      reqMem: "内存",
      reqMemVal: "推荐 4 GB 及以上",
    },
    en: {
      download: "Download",
      channelRelease: "Stable",
      channelPreRelease: "Early Access",
      channelDev: "Dev",
      recommend: "Recommend",
      changelog: "Changelog",
      channelUnavailable: "No version available",
      iosHint: "Coming soon — Stay tuned",
      noPlatformPkg: "No {p} package · View history",
      loading: "Loading...",
      noHistory: "No historical version data. Please try later.",
      noHistoryShort: "No historical version data.",
      noDownloadData: "No download data available",
      noPlatformAny: "No packages available",
      noChangelog: "No changelog available",
      noArchPkg: "No {p} packages for this version",
      archApple: "Apple Silicon (M-Series)",
      archIntel: "Intel",
      viewAllArch: "View all architectures",
      downloadOptions: "Download options",
      historyVersions: "Historical versions",
      historyHint: "Click to expand and load history...",
      descRelease: "Recommended for daily use. Fully tested with minimal bugs, ideal for users who value stability.",
      descPreRelease: "Be the first to experience new features. Contains the latest completed features, there may be a few bugs, suitable for early adopters.",
      descDev: "The latest development version. Contains features under development with many bugs. Only recommended for developers or advanced users.",
      sourceInstall: "Source code installation",
      dockerInstall: "Docker",
      dockerTitle: "Docker installation",
      dockerDesc: "Ideal for server container deployment. Clone the repo, set your API key, then build and start with one command.",
      dockerReqTitle: "System requirements",
      dockerTutorial: "View full Docker guide",
      reqItem: "Item",
      reqDesc: "Description",
      reqOs: "OS",
      reqPerm: "Permissions",
      reqDocker: "Container runtime",
      reqApi: "API Key",
      reqDisk: "Disk",
      reqDiskVal: "20 GB or more recommended",
      reqMem: "Memory",
      reqMemVal: "4 GB or more recommended",
    },
    ja: {
      download: "ダウンロード",
      channelRelease: "安定版",
      channelPreRelease: "先行版",
      channelDev: "開発版",
      recommend: "推奨",
      changelog: "更新履歴",
      channelUnavailable: "このチャネルのバージョンはありません",
      iosHint: "近日公開予定",
      noPlatformPkg: "{p} パッケージなし · 履歴を表示",
      loading: "読み込み中...",
      noHistory: "過去のバージョンデータがありません。",
      noHistoryShort: "過去のバージョンデータがありません。",
      noDownloadData: "ダウンロードデータなし",
      noPlatformAny: "パッケージがありません",
      noChangelog: "更新履歴なし",
      noArchPkg: "このバージョンの {p} パッケージはありません",
      archApple: "Apple Silicon（Mシリーズ）",
      archIntel: "Intel",
      viewAllArch: "全アーキテクチャを表示",
      downloadOptions: "ダウンロードオプション",
      historyVersions: "過去のバージョン",
      historyHint: "クリックして過去のバージョンを読み込む...",
      descRelease: "日常使用に推奨。十分にテストされ、バグがほぼなく、安定性を重視するユーザーに最適です。",
      descPreRelease: "新機能をいち早く体験。最新の完成機能を含み、若干のバグがある場合があります。",
      descDev: "最新の開発版。開発中の機能を含み、バグが多数あります。開発者または上級ユーザーのみ推奨。",
      sourceInstall: "ソースコードインストール",
      dockerInstall: "Docker",
      dockerTitle: "Docker インストール",
      dockerDesc: "サーバー向けコンテナデプロイに最適。リポジトリをクローンし、API Key を設定してワンコマンドでビルド・起動。",
      dockerReqTitle: "システム要件",
      dockerTutorial: "Docker 完全ガイドを見る",
      reqItem: "項目",
      reqDesc: "説明",
      reqOs: "OS",
      reqPerm: "権限",
      reqDocker: "コンテナランタイム",
      reqApi: "API Key",
      reqDisk: "ディスク",
      reqDiskVal: "20 GB 以上推奨",
      reqMem: "メモリ",
      reqMemVal: "4 GB 以上推奨",
    },
    ko: {
      download: "다운로드",
      channelRelease: "안정판",
      channelPreRelease: "사전 체험판",
      channelDev: "개발판",
      recommend: "추천",
      changelog: "변경 로그",
      channelUnavailable: "사용 가능한 버전 없음",
      iosHint: "곧 출시 예정",
      noPlatformPkg: "{p} 패키지 없음 · 기록 보기",
      loading: "로딩 중...",
      noHistory: "과거 버전 데이터가 없습니다.",
      noHistoryShort: "과거 버전 데이터가 없습니다.",
      noDownloadData: "다운로드 데이터 없음",
      noPlatformAny: "사용 가능한 패키지 없음",
      noChangelog: "변경 로그 없음",
      noArchPkg: "이 버전의 {p} 패키지가 없습니다",
      archApple: "Apple Silicon (M 시리즈)",
      archIntel: "Intel",
      viewAllArch: "전체 아키텍처 보기",
      downloadOptions: "다운로드 옵션",
      historyVersions: "이전 버전",
      historyHint: "클릭하여 이전 버전 로드...",
      descRelease: "일상 사용에 권장됩니다. 충분히 테스트되어 안정적인 경험을 원하는 사용자에게 적합합니다.",
      descPreRelease: "새로운 기능을 먼저 체험하세요. 약간의 버그가 있을 수 있으며 얼리 어답터에게 적합합니다.",
      descDev: "최신 개발 버전. 개발 중인 기능이 포함되어 있으며 개발자 또는 고급 사용자만 권장됩니다.",
      sourceInstall: "소스 코드 설치",
      dockerInstall: "Docker",
      dockerTitle: "Docker 설치",
      dockerDesc: "서버 컨테이너 배포에 적합합니다. 저장소를 클론하고 API Key를 설정한 뒤 한 번에 빌드 및 시작합니다.",
      dockerReqTitle: "시스템 요구 사항",
      dockerTutorial: "전체 Docker 가이드 보기",
      reqItem: "항목",
      reqDesc: "설명",
      reqOs: "OS",
      reqPerm: "권한",
      reqDocker: "컨테이너 런타임",
      reqApi: "API Key",
      reqDisk: "디스크",
      reqDiskVal: "20 GB 이상 권장",
      reqMem: "메모리",
      reqMemVal: "4 GB 이상 권장",
    },
    ru: {
      download: "Скачать",
      channelRelease: "Стабильная",
      channelPreRelease: "Ранний доступ",
      channelDev: "Разработка",
      recommend: "Рекомендуем",
      changelog: "Журнал изменений",
      channelUnavailable: "Версия недоступна",
      iosHint: "Скоро — следите за обновлениями",
      noPlatformPkg: "Нет пакета {p} · Просмотр истории",
      loading: "Загрузка...",
      noHistory: "Нет данных о предыдущих версиях.",
      noHistoryShort: "Нет данных о предыдущих версиях.",
      noDownloadData: "Нет данных для загрузки",
      noPlatformAny: "Пакеты недоступны",
      noChangelog: "Журнал изменений недоступен",
      noArchPkg: "Нет пакетов {p} для этой версии",
      archApple: "Apple Silicon (серия M)",
      archIntel: "Intel",
      viewAllArch: "Все архитектуры",
      downloadOptions: "Параметры загрузки",
      historyVersions: "История версий",
      historyHint: "Нажмите для загрузки истории версий...",
      descRelease: "Рекомендуется для ежедневного использования. Полностью протестировано, минимум ошибок.",
      descPreRelease: "Попробуйте новые функции первыми. Может содержать незначительные ошибки.",
      descDev: "Последняя версия для разработки. Содержит функции в разработке, много ошибок. Только для разработчиков.",
      sourceInstall: "Установка из исходного кода",
      dockerInstall: "Docker",
      dockerTitle: "Установка Docker",
      dockerDesc: "Подходит для контейнерного развёртывания на сервере. Клонируйте репозиторий, настройте API Key и запустите одной командой.",
      dockerReqTitle: "Системные требования",
      dockerTutorial: "Полное руководство по Docker",
      reqItem: "Параметр",
      reqDesc: "Описание",
      reqOs: "ОС",
      reqPerm: "Права",
      reqDocker: "Контейнерная среда",
      reqApi: "API Key",
      reqDisk: "Диск",
      reqDiskVal: "Рекомендуется 20 ГБ и более",
      reqMem: "Память",
      reqMemVal: "Рекомендуется 4 ГБ и более",
    },
    fr: {
      download: "Télécharger",
      channelRelease: "Stable",
      channelPreRelease: "Accès anticipé",
      channelDev: "Dev",
      recommend: "Recommandé",
      changelog: "Journal des modifications",
      channelUnavailable: "Aucune version disponible",
      iosHint: "Bientôt disponible",
      noPlatformPkg: "Pas de paquet {p} · Voir l'historique",
      loading: "Chargement...",
      noHistory: "Aucune donnée de version historique.",
      noHistoryShort: "Aucune donnée de version historique.",
      noDownloadData: "Aucune donnée de téléchargement",
      noPlatformAny: "Aucun paquet disponible",
      noChangelog: "Aucun journal disponible",
      noArchPkg: "Aucun paquet {p} pour cette version",
      archApple: "Apple Silicon (série M)",
      archIntel: "Intel",
      viewAllArch: "Toutes les architectures",
      downloadOptions: "Options de téléchargement",
      historyVersions: "Versions précédentes",
      historyHint: "Cliquez pour charger les versions précédentes...",
      descRelease: "Recommandé pour une utilisation quotidienne. Entièrement testé avec un minimum de bugs.",
      descPreRelease: "Soyez le premier à essayer les nouvelles fonctionnalités. Peut contenir quelques bugs.",
      descDev: "Dernière version de développement. Contient des fonctionnalités en développement. Réservé aux développeurs.",
      sourceInstall: "Installation depuis les sources",
      dockerInstall: "Docker",
      dockerTitle: "Installation Docker",
      dockerDesc: "Idéal pour le déploiement conteneurisé sur serveur. Clonez le dépôt, configurez la clé API, puis build et démarrage en une commande.",
      dockerReqTitle: "Configuration requise",
      dockerTutorial: "Voir le guide Docker complet",
      reqItem: "Élément",
      reqDesc: "Description",
      reqOs: "Système",
      reqPerm: "Permissions",
      reqDocker: "Runtime conteneur",
      reqApi: "API Key",
      reqDisk: "Disque",
      reqDiskVal: "20 Go ou plus recommandés",
      reqMem: "Mémoire",
      reqMemVal: "4 Go ou plus recommandés",
    },
    de: {
      download: "Herunterladen",
      channelRelease: "Stabil",
      channelPreRelease: "Vorabzugang",
      channelDev: "Entwicklung",
      recommend: "Empfohlen",
      changelog: "Änderungsprotokoll",
      channelUnavailable: "Keine Version verfügbar",
      iosHint: "Demnächst verfügbar",
      noPlatformPkg: "Kein {p}-Paket · Verlauf anzeigen",
      loading: "Wird geladen...",
      noHistory: "Keine historischen Versionsdaten.",
      noHistoryShort: "Keine historischen Versionsdaten.",
      noDownloadData: "Keine Download-Daten",
      noPlatformAny: "Keine Pakete verfügbar",
      noChangelog: "Kein Änderungsprotokoll",
      noArchPkg: "Keine {p}-Pakete für diese Version",
      archApple: "Apple Silicon (M-Serie)",
      archIntel: "Intel",
      viewAllArch: "Alle Architekturen",
      downloadOptions: "Download-Optionen",
      historyVersions: "Versionsverlauf",
      historyHint: "Klicken zum Laden des Versionsverlaufs...",
      descRelease: "Empfohlen für den täglichen Gebrauch. Vollständig getestet mit minimalen Fehlern.",
      descPreRelease: "Neue Funktionen zuerst erleben. Kann einige Fehler enthalten.",
      descDev: "Neueste Entwicklungsversion. Enthält Funktionen in Entwicklung. Nur für Entwickler empfohlen.",
      sourceInstall: "Installation aus Quellcode",
      dockerInstall: "Docker",
      dockerTitle: "Docker-Installation",
      dockerDesc: "Ideal für containerisierte Server-Bereitstellung. Repository klonen, API Key setzen, dann mit einem Befehl bauen und starten.",
      dockerReqTitle: "Systemanforderungen",
      dockerTutorial: "Vollständige Docker-Anleitung",
      reqItem: "Element",
      reqDesc: "Beschreibung",
      reqOs: "System",
      reqPerm: "Berechtigungen",
      reqDocker: "Container-Runtime",
      reqApi: "API Key",
      reqDisk: "Festplatte",
      reqDiskVal: "20 GB oder mehr empfohlen",
      reqMem: "Arbeitsspeicher",
      reqMemVal: "4 GB oder mehr empfohlen",
    },
  };

  function dlLang() {
    return localStorage.getItem("openakita_language") || "zh";
  }

  function dt(key) {
    var lang = dlLang();
    var msgs = DL_MSGS[lang] || DL_MSGS.en || {};
    return msgs[key] || (DL_MSGS.en || {})[key] || (DL_MSGS.zh || {})[key] || key;
  }

  function channelLabel(ch) {
    var map = { release: "channelRelease", "pre-release": "channelPreRelease", dev: "channelDev", pre_release: "channelPreRelease" };
    return dt(map[ch] || ch);
  }

  // ── State ──
  var state = {
    platform: null,
    manifests: {},       // { release: {...}, "pre-release": {...}, dev: {...} }
    versionsIndex: null,  // versions.json content
    versionCache: {},     // { "v1.25.9": manifest }
    historyLoaded: false,
    activeNotesChannel: "release",
  };

  // ── Platform Detection ──
  function detectPlatform() {
    var ua = navigator.userAgent || "";
    if (/Android/i.test(ua)) return "android";
    if (/iPad|iPhone|iPod/.test(ua)) return "ios";
    if (/Win/i.test(ua)) return "windows";
    if (/Mac/i.test(ua)) return "macos";
    if (/Linux/i.test(ua)) return "linux";
    return "windows";
  }

  // ── Data Fetching ──
  function fetchJSON(url, timeoutMs) {
    return fetch(url, { signal: AbortSignal.timeout(timeoutMs || 6000) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function fetchChannelManifest(channel) {
    return fetchJSON(OSS_BASE + "/api/" + channel + ".json");
  }

  function fetchVersionManifest(version) {
    var key = "v" + version.replace(/^v/, "");
    if (state.versionCache[key]) {
      return Promise.resolve(state.versionCache[key]);
    }
    return fetchJSON(OSS_BASE + "/api/releases/" + key + ".json").then(function (data) {
      if (data) state.versionCache[key] = data;
      return data;
    });
  }

  function fetchVersionsIndex() {
    if (state.versionsIndex) return Promise.resolve(state.versionsIndex);
    return fetchJSON(OSS_BASE + "/api/versions.json").then(function (data) {
      if (data) state.versionsIndex = data;
      return data;
    });
  }

  // ── Fallback: build manifest from GitHub API ──
  function fetchGHLatest() {
    return fetchJSON(
      "https://api.github.com/repos/" + GH_REPO + "/releases/latest", 8000
    );
  }

  function ghAssetToDownloads(release) {
    if (!release || !release.assets) return null;
    var tag = release.tag_name || "";
    var assets = release.assets;
    var downloads = {};
    var patterns = [
      { platform: "windows", key: "windows-x64", ext: /\.exe$/i, inc: /core/i, exc: /full|uninstall/i, nick: "Windows 10/11 x64" },
      { platform: "macos", key: "macos-arm64", ext: /\.dmg$/i, inc: /arm64|aarch64/i, exc: null, nick: "macOS Apple Silicon (.dmg)" },
      { platform: "macos", key: "macos-x64", ext: /\.dmg$/i, inc: /x64|x86_64|intel/i, exc: null, nick: "macOS Intel (.dmg)" },
      { platform: "linux", key: "linux-deb-ubuntu24-amd64", ext: /\.deb$/i, inc: /ubuntu24-amd64/i, exc: null, nick: "Ubuntu 24 x64 (.deb)" },
      { platform: "linux", key: "linux-deb-ubuntu24-arm64", ext: /\.deb$/i, inc: /ubuntu24-arm64/i, exc: null, nick: "Ubuntu 24 ARM64 (.deb)" },
      { platform: "linux", key: "linux-deb-ubuntu22-amd64", ext: /\.deb$/i, inc: /ubuntu22-amd64/i, exc: null, nick: "Ubuntu 22 x64 (.deb)" },
      { platform: "linux", key: "linux-deb-ubuntu22-arm64", ext: /\.deb$/i, inc: /ubuntu22-arm64/i, exc: null, nick: "Ubuntu 22 ARM64 (.deb)" },
      { platform: "linux", key: "linux-appimage-x64", ext: /\.appimage$/i, inc: null, exc: /arm64|aarch64/i, nick: "Linux AppImage x64" },
      { platform: "android", key: "android-apk", ext: /\.apk$/i, inc: /android/i, exc: null, nick: "Android APK" },
      { platform: "ios", key: "ios-ipa", ext: /\.ipa$/i, inc: /ios/i, exc: null, nick: "iOS IPA" },
    ];
    patterns.forEach(function (p) {
      var found = assets.find(function (a) {
        var n = a.name || "";
        if (!p.ext.test(n)) return false;
        if (p.inc && !p.inc.test(n)) return false;
        if (p.exc && p.exc.test(n)) return false;
        return true;
      });
      if (found) {
        if (!downloads[p.platform]) downloads[p.platform] = [];
        downloads[p.platform].push({
          key: p.key, nickname: p.nick, name: found.name,
          url: found.browser_download_url, size: found.size || 0,
        });
      }
    });
    return {
      version: tag.replace(/^v/, ""),
      channel: "release",
      pub_date: release.published_at || "",
      notes: release.body || "",
      downloads: downloads,
      platforms: {},
    };
  }

  // ── Utility ──
  function formatSize(bytes) {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    } catch (e) { return iso.slice(0, 10); }
  }

  function pickPlatformDownload(downloads, platform) {
    if (!downloads) return null;
    var items = downloads[platform];
    if (!items || items.length === 0) return null;
    return items[0];
  }

  function shortArchLabel(nickname) {
    if (/arm64|aarch64|apple.silicon/i.test(nickname)) return dt("archApple");
    if (/x64|x86_64|intel/i.test(nickname)) return dt("archIntel");
    return nickname;
  }

  function renderMarkdown(md) {
    if (typeof marked !== "undefined" && marked.parse) {
      return marked.parse(md || "");
    }
    return "<pre>" + escapeHtml(md || "") + "</pre>";
  }

  var CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

  function splitNotes(notes) {
    if (!notes || !notes.trim()) return null;
    var lines = notes.split("\n");
    var h2s = [];
    var footerStart = lines.length;

    for (var i = 0; i < lines.length; i++) {
      var s = lines[i].trim();
      if (s.indexOf("**Full Changelog**") === 0) { footerStart = i; break; }
      if (s.indexOf("## ") === 0) {
        h2s.push({ idx: i, zh: CJK_RE.test(s) });
      }
    }
    if (!h2s.length) return null;

    var hasZh = h2s.some(function (h) { return h.zh; });
    var hasEn = h2s.some(function (h) { return !h.zh; });
    if (!hasZh || !hasEn) return null;

    var zhParts = [], enParts = [];
    for (var j = 0; j < h2s.length; j++) {
      var start = h2s[j].idx;
      var end = (j + 1 < h2s.length) ? h2s[j + 1].idx : footerStart;
      var chunk = lines.slice(start, end).join("\n");
      (h2s[j].zh ? zhParts : enParts).push(chunk);
    }

    var footer = lines.slice(footerStart).join("\n").trim();
    var zhText = zhParts.join("\n").trim();
    var enText = enParts.join("\n").trim();
    if (footer) {
      if (zhText) zhText += "\n\n" + footer;
      if (enText) enText += "\n\n" + footer;
    }
    return { zh: zhText, en: enText };
  }

  function getLocalizedNotes(manifest) {
    if (!manifest) return "";
    var lang = dlLang();
    var isZh = (lang === "zh");

    if (isZh && manifest.notes_zh) return manifest.notes_zh;
    if (!isZh && manifest.notes_en) return manifest.notes_en;

    var notes = manifest.notes || "";
    if (!notes) return "";

    var split = splitNotes(notes);
    if (split) return isZh ? (split.zh || notes) : (split.en || notes);
    return notes;
  }

  function hasNotes(manifest) {
    return manifest && (manifest.notes || manifest.notes_zh || manifest.notes_en);
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // ── Tab Switching ──
  function initTabs() {
    var tabs = document.querySelectorAll(".install-tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-tab");
        tabs.forEach(function (t) {
          t.classList.toggle("active", t === tab);
          t.setAttribute("aria-selected", t === tab ? "true" : "false");
        });
        document.querySelectorAll(".tab-panel").forEach(function (p) {
          p.style.display = p.id === "panel-" + target ? "" : "none";
          p.classList.toggle("active", p.id === "panel-" + target);
        });
      });
    });
  }

  // ── Platform Switching ──
  function initPlatformSelector() {
    var btns = document.querySelectorAll(".platform-btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectPlatform(btn.getAttribute("data-platform"));
      });
    });
  }

  function selectPlatform(platform) {
    state.platform = platform;
    document.querySelectorAll(".platform-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-platform") === platform);
    });
    renderAllChannels();
  }

  // ── Channel Card Rendering ──
  function renderChannelCard(channel, manifest) {
    var idPrefix = CHANNEL_IDS[channel];
    var versionEl = document.getElementById(idPrefix + "Version");
    var dateEl = document.getElementById(idPrefix + "Date");
    var actionsEl = document.getElementById(idPrefix + "Actions");
    var allArchEl = document.getElementById(idPrefix + "AllArch");
    var card = actionsEl ? actionsEl.closest(".channel-card") : null;

    if (!manifest || !manifest.version) {
      if (versionEl) versionEl.textContent = "--";
      if (dateEl) dateEl.textContent = "";
      if (actionsEl) actionsEl.innerHTML = '<span class="channel-unavailable">' + escapeHtml(dt("channelUnavailable")) + '</span>';
      if (allArchEl) allArchEl.style.display = "none";
      if (card) card.classList.add("channel-card-empty");
      return;
    }

    if (card) card.classList.remove("channel-card-empty");
    if (versionEl) versionEl.textContent = "v" + manifest.version;
    if (dateEl) dateEl.textContent = formatDate(manifest.pub_date);

    var platform = state.platform;
    var platformItems = manifest.downloads ? manifest.downloads[platform] : null;
    var dl = platformItems && platformItems.length > 0 ? platformItems[0] : null;

    if (actionsEl) {
      if (platform === "ios" && (!dl || !dl.url)) {
        actionsEl.innerHTML = '<span class="channel-ios-hint">' + escapeHtml(dt("iosHint")) + '</span>';
      } else if (platform === "macos" && platformItems && platformItems.length > 1) {
        var html = '<div class="macos-arch-buttons">';
        platformItems.forEach(function (item) {
          var sizeStr = formatSize(item.size);
          var label = shortArchLabel(item.nickname);
          html +=
            '<a class="btn btn-primary channel-dl-btn" href="' + escapeHtml(item.url) + '">' +
            escapeHtml(dt("download")) + ' ' + escapeHtml(label) +
            (sizeStr ? ' <span class="dl-size">' + sizeStr + '</span>' : '') +
            '</a>';
        });
        html += '</div>';
        actionsEl.innerHTML = html;
      } else if (dl) {
        var sizeStr = formatSize(dl.size);
        actionsEl.innerHTML =
          '<a class="btn btn-primary channel-dl-btn" href="' + escapeHtml(dl.url) + '">' +
          escapeHtml(dt("download")) + ' ' + escapeHtml(dl.nickname) +
          (sizeStr ? ' <span class="dl-size">' + sizeStr + '</span>' : '') +
          '</a>';
      } else {
        actionsEl.innerHTML =
          '<a class="btn btn-secondary channel-dl-btn" href="#versionHistory" onclick="document.getElementById(\'versionHistory\').open=true;document.getElementById(\'versionHistory\').scrollIntoView({behavior:\'smooth\'});return false;">' +
          escapeHtml(dt("noPlatformPkg").replace("{p}", platformLabel(platform))) + '</a>';
      }
    }

    // "All architectures" link (hidden for macOS since both are already shown)
    if (allArchEl) {
      if (platformItems && platformItems.length > 1 && platform !== "macos") {
        allArchEl.style.display = "";
        allArchEl.onclick = function (e) {
          e.preventDefault();
          showArchDetail(channel, manifest, platform);
        };
      } else {
        allArchEl.style.display = "none";
      }
    }

    if (card) {
      card.classList.toggle("channel-card-active", channel === state.activeNotesChannel);
    }
  }

  function renderAllChannels() {
    CHANNELS.forEach(function (ch) {
      renderChannelCard(ch, state.manifests[ch]);
    });
    renderReleaseNotes();
  }

  // ── Channel card hover → switch release notes ──
  function initChannelHover() {
    document.querySelectorAll(".channel-card").forEach(function (card) {
      card.addEventListener("mouseenter", function () {
        var ch = card.getAttribute("data-channel");
        var m = state.manifests[ch];
        if (hasNotes(m)) {
          switchNotesChannel(ch);
        }
      });
    });
  }

  // ── Arch Detail Overlay ──
  function showArchDetail(channel, manifest, platform, enablePlatformSwitch) {
    var overlay = document.getElementById("archDetailOverlay");
    var body = document.getElementById("archDetailBody");
    var title = document.getElementById("archDetailTitle");
    if (!overlay || !body) return;

    var chLabel = channelLabel(channel);

    function renderForPlatform(p) {
      title.textContent = chLabel + " v" + manifest.version + " — " + platformLabel(p);

      var html = "";

      if (enablePlatformSwitch) {
        var available = Object.keys(manifest.downloads || {}).filter(function (k) {
          return (manifest.downloads[k] || []).length > 0;
        });
        if (available.length > 1) {
          html += '<div class="arch-platform-tabs">';
          available.forEach(function (k) {
            var cls = k === p ? "arch-platform-tab active" : "arch-platform-tab";
            html += '<button class="' + cls + '" data-platform="' + escapeHtml(k) + '">' +
              escapeHtml(platformLabel(k)) + '</button>';
          });
          html += '</div>';
        }
      }

      var items = (manifest.downloads || {})[p] || [];
      html += '<div class="arch-list">';
      if (items.length === 0) {
        html += '<p class="arch-empty">' + escapeHtml(dt("noArchPkg").replace("{p}", platformLabel(p))) + '</p>';
      } else {
        items.forEach(function (item) {
          var sizeStr = formatSize(item.size);
          html += '<a class="arch-item" href="' + escapeHtml(item.url) + '">' +
            '<span class="arch-name">' + escapeHtml(item.nickname) + '</span>' +
            (sizeStr ? '<span class="arch-size">' + sizeStr + '</span>' : '') +
            '<span class="arch-file">' + escapeHtml(item.name) + '</span>' +
            '</a>';
        });
      }
      html += '</div>';
      body.innerHTML = html;

      if (enablePlatformSwitch) {
        body.querySelectorAll(".arch-platform-tab").forEach(function (tab) {
          tab.addEventListener("click", function () {
            renderForPlatform(tab.getAttribute("data-platform"));
          });
        });
      }
    }

    renderForPlatform(platform);
    overlay.style.display = "";
  }

  function platformLabel(p) {
    return { windows: "Windows", macos: "macOS", linux: "Linux", android: "Android", ios: "iOS" }[p] || p;
  }

  function initArchOverlay() {
    var overlay = document.getElementById("archDetailOverlay");
    var closeBtn = document.getElementById("archDetailClose");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) overlay.style.display = "none";
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        document.getElementById("archDetailOverlay").style.display = "none";
      });
    }
  }

  // ── Release Notes ──
  function switchNotesChannel(channel) {
    state.activeNotesChannel = channel;
    renderReleaseNotes();
    document.querySelectorAll(".channel-card").forEach(function (card) {
      var ch = card.getAttribute("data-channel");
      card.classList.toggle("channel-card-active", ch === channel);
    });
  }

  function renderReleaseNotes() {
    var section = document.getElementById("releaseNotesSection");
    var titleEl = document.getElementById("releaseNotesTitle");
    var contentEl = document.getElementById("releaseNotesContent");
    if (!section || !contentEl) return;

    var manifest = state.manifests[state.activeNotesChannel];
    if (!hasNotes(manifest)) {
      var fallback = CHANNELS.find(function (ch) {
        return hasNotes(state.manifests[ch]);
      });
      manifest = fallback ? state.manifests[fallback] : null;
      if (fallback) state.activeNotesChannel = fallback;
    }

    if (!hasNotes(manifest)) {
      section.style.display = "none";
      return;
    }

    var label = channelLabel(state.activeNotesChannel);
    section.style.display = "";
    if (titleEl) titleEl.textContent = label + " v" + manifest.version + " " + dt("changelog");
    contentEl.innerHTML = renderMarkdown(getLocalizedNotes(manifest));
  }

  // ── History ──
  function initHistory() {
    var details = document.getElementById("versionHistory");
    if (!details) return;
    details.addEventListener("toggle", function () {
      if (details.open && !state.historyLoaded) {
        loadHistory();
      }
    });
  }

  function loadHistory() {
    var container = document.getElementById("versionHistoryContent");
    if (!container) return;
    container.innerHTML = '<p class="channel-loading">' + escapeHtml(dt("loading")) + '</p>';

    fetchVersionsIndex().then(function (index) {
      state.historyLoaded = true;
      if (!index) {
        container.innerHTML = '<p>' + escapeHtml(dt("noHistory")) + '</p>';
        return;
      }
      renderHistory(index, container);
    });
  }

  function renderHistory(index, container) {
    var channelKeys = ["release", "pre_release", "dev"];

    // Merge all entries from all channels, keeping the latest patch per minor version
    var minorGroups = {};
    channelKeys.forEach(function (key) {
      var entries = index[key];
      if (!entries) return;
      entries.forEach(function (entry) {
        var parts = entry.version.split(".");
        if (parts.length < 2) return;
        var minor = parts[0] + "." + parts[1];
        var patch = parseInt(parts[2], 10) || 0;

        if (!minorGroups[minor] || patch > minorGroups[minor].patch) {
          minorGroups[minor] = {
            version: entry.version,
            pub_date: entry.pub_date,
            platforms: entry.platforms,
            channel: key,
            patch: patch,
          };
        }
      });
    });

    // Sort by minor version descending
    var sortedMinors = Object.keys(minorGroups).sort(function (a, b) {
      var ap = a.split(".").map(Number);
      var bp = b.split(".").map(Number);
      return (bp[0] - ap[0]) || (bp[1] - ap[1]);
    });

    var html = "";
    if (sortedMinors.length > 0) {
      html += '<div class="history-list">';
      sortedMinors.forEach(function (minor) {
        var entry = minorGroups[minor];
        var platforms = (entry.platforms || []).map(function (p) { return platformLabel(p); }).join(", ");
        html += '<div class="history-item" data-version="' + escapeHtml(entry.version) + '">';
        html += '<span class="history-version">v' + escapeHtml(entry.version) + '</span>';
        var tagClass = { release: "badge-release", pre_release: "badge-prerelease", dev: "badge-dev" }[entry.channel] || "";
        html += '<span class="history-channel-tag ' + tagClass + '">' + escapeHtml(channelLabel(entry.channel)) + '</span>';
        html += '<span class="history-date">' + formatDate(entry.pub_date) + '</span>';
        html += '<span class="history-platforms">' + escapeHtml(platforms) + '</span>';
        html += '<button class="history-dl-btn" data-version="' + escapeHtml(entry.version) + '">' + escapeHtml(dt("download")) + '</button>';
        html += '<button class="history-notes-btn" data-version="' + escapeHtml(entry.version) + '">' + escapeHtml(dt("changelog")) + '</button>';
        html += '</div>';
      });
      html += '</div>';
    } else {
      html = '<p>' + escapeHtml(dt("noHistoryShort")) + '</p>';
    }

    container.innerHTML = html;

    // Bind click events
    container.querySelectorAll(".history-dl-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showHistoryDownload(btn.getAttribute("data-version"));
      });
    });
    container.querySelectorAll(".history-notes-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showHistoryNotes(btn.getAttribute("data-version"));
      });
    });
  }

  function showHistoryDownload(version) {
    fetchVersionManifest(version).then(function (manifest) {
      if (!manifest) {
        alert("v" + version + " — " + dt("noDownloadData"));
        return;
      }
      var downloads = manifest.downloads || {};
      var hasAny = Object.keys(downloads).some(function (k) {
        return downloads[k] && downloads[k].length > 0;
      });
      if (!hasAny) {
        alert("v" + version + " — " + dt("noPlatformAny"));
        return;
      }
      var platform = state.platform;
      if (!downloads[platform] || downloads[platform].length === 0) {
        platform = Object.keys(downloads).find(function (k) {
          return downloads[k] && downloads[k].length > 0;
        }) || state.platform;
      }
      showArchDetail(manifest.channel || "release", manifest, platform, true);
    });
  }

  function showHistoryNotes(version) {
    fetchVersionManifest(version).then(function (manifest) {
      if (!hasNotes(manifest)) {
        alert("v" + version + " — " + dt("noChangelog"));
        return;
      }
      var overlay = document.getElementById("notesModalOverlay");
      var titleEl = document.getElementById("notesModalTitle");
      var bodyEl = document.getElementById("notesModalBody");
      if (!overlay || !bodyEl) return;
      if (titleEl) titleEl.textContent = "v" + version + " " + dt("changelog");
      bodyEl.innerHTML = renderMarkdown(getLocalizedNotes(manifest));
      overlay.style.display = "";
    });
  }

  function initNotesModal() {
    var overlay = document.getElementById("notesModalOverlay");
    var closeBtn = document.getElementById("notesModalClose");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) overlay.style.display = "none";
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        document.getElementById("notesModalOverlay").style.display = "none";
      });
    }
  }

  // ── Initialization ──
  function init() {
    initTabs();
    initPlatformSelector();
    initArchOverlay();
    initNotesModal();
    initChannelHover();
    initHistory();

    state.platform = detectPlatform();
    selectPlatform(state.platform);

    // Load all three channel manifests in parallel
    Promise.allSettled([
      fetchChannelManifest("release"),
      fetchChannelManifest("pre-release"),
      fetchChannelManifest("dev"),
    ]).then(function (results) {
      var release = results[0].status === "fulfilled" ? results[0].value : null;
      var preRelease = results[1].status === "fulfilled" ? results[1].value : null;
      var dev = results[2].status === "fulfilled" ? results[2].value : null;

      // Fallback to GitHub API if no release manifest found
      if (!release || !release.version) {
        return fetchGHLatest().then(function (ghRelease) {
          var ghManifest = ghAssetToDownloads(ghRelease);
          if (ghManifest) release = ghManifest;
          return { release: release, "pre-release": preRelease, dev: dev };
        });
      }
      return { release: release, "pre-release": preRelease, dev: dev };
    }).then(function (manifests) {
      // Deduplicate: if two channels have the same version, hide the lower-priority one
      var versions = {};
      CHANNELS.forEach(function (ch) {
        var m = manifests[ch];
        if (m && m.version) {
          if (versions[m.version]) {
            manifests[ch] = null;
          } else {
            versions[m.version] = true;
          }
        }
      });

      state.manifests = manifests;
      // Set initial active notes channel to first channel with notes
      var initialNotes = CHANNELS.find(function (ch) {
        return hasNotes(manifests[ch]);
      });
      if (initialNotes) state.activeNotesChannel = initialNotes;
      renderAllChannels();

      // Cache manifests in version cache for history
      CHANNELS.forEach(function (ch) {
        var m = manifests[ch];
        if (m && m.version) {
          state.versionCache["v" + m.version] = m;
        }
      });

      // Update legacy home page version badge if present
      var verBadge = document.getElementById("latestReleaseVersion");
      var dateBadge = document.getElementById("latestReleaseDate");
      var displayM = manifests.release || manifests["pre-release"] || manifests.dev;
      if (verBadge && displayM) verBadge.textContent = "v" + displayM.version;
      if (dateBadge && displayM) dateBadge.textContent = formatDate(displayM.pub_date);
    });
  }

  function setDlText(el, text) {
    if (!el) return;
    el.textContent = text;
    el.dataset.i18nManaged = "";
  }

  function translateStaticHTML() {
    var q = function (sel) { return document.querySelector(sel); };
    var qa = function (sel) { return document.querySelectorAll(sel); };

    setDlText(q('.channel-card[data-channel="release"] .badge-release'), dt("channelRelease"));
    setDlText(q('.channel-card[data-channel="release"] .channel-recommend'), dt("recommend"));
    setDlText(q('.channel-card[data-channel="pre-release"] .badge-prerelease'), dt("channelPreRelease"));
    setDlText(q('.channel-card[data-channel="dev"] .badge-dev'), dt("channelDev"));

    var descMap = { release: "descRelease", "pre-release": "descPreRelease", dev: "descDev" };
    qa(".channel-card").forEach(function (card) {
      var ch = card.getAttribute("data-channel");
      var desc = card.querySelector(".channel-card-desc");
      if (desc && descMap[ch]) setDlText(desc, dt(descMap[ch]));
    });

    qa(".channel-card-all-arch").forEach(function (a) { setDlText(a, dt("viewAllArch")); });

    var archTitle = q("#archDetailTitle");
    if (archTitle && !archTitle.textContent.match(/^v?\d/)) setDlText(archTitle, dt("downloadOptions"));

    setDlText(q("#versionHistory > summary"), dt("historyVersions"));

    var historyHint = q("#versionHistoryContent > .channel-loading");
    if (historyHint && !state.historyLoaded) setDlText(historyHint, dt("historyHint"));

    qa(".channel-card-actions .channel-loading").forEach(function (el) {
      setDlText(el, dt("loading"));
    });

    setDlText(q('.install-tab[data-tab="source"] span'), dt("sourceInstall"));
    setDlText(q('.install-tab[data-tab="docker"] span'), dt("dockerInstall"));

    qa("[data-i18n-dl]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-dl");
      if (key) setDlText(el, dt(key));
    });

    var dockerTutorialLink = q('#panel-docker .btn-secondary');
    if (dockerTutorialLink) setDlText(dockerTutorialLink, dt("dockerTutorial"));
  }

  function onLanguageChanged() {
    translateStaticHTML();
    renderAllChannels();
    if (state.historyLoaded && state.versionsIndex) {
      var container = document.getElementById("versionHistoryContent");
      if (container) renderHistory(state.versionsIndex, container);
    }
  }

  document.addEventListener("openakita:language-changed", onLanguageChanged);

  // ── Download Click Tracking ──
  function parseDownloadInfo(href, el) {
    var filename = (href || "").split("/").pop().split("?")[0];
    var card = el.closest ? el.closest(".channel-card") : null;
    var historyItem = el.closest ? el.closest(".history-item") : null;
    var archPanel = el.closest ? el.closest(".arch-detail-panel") : null;
    var channel = "";
    var version = "";

    if (card) {
      channel = card.getAttribute("data-channel") || "";
      var vEl = card.querySelector(".channel-card-version");
      version = vEl ? (vEl.textContent || "").replace(/^v/, "") : "";
    } else if (historyItem) {
      version = historyItem.getAttribute("data-version") || "";
    } else if (archPanel) {
      var title = archPanel.querySelector("#archDetailTitle");
      var m = title ? (title.textContent || "").match(/v([\d.]+)/) : null;
      if (m) version = m[1];
    }

    var platform = state.platform || "";
    if (/\.exe$/i.test(filename)) platform = "windows";
    else if (/\.dmg$/i.test(filename)) platform = "macos";
    else if (/\.deb$/i.test(filename)) platform = "linux";
    else if (/\.appimage$/i.test(filename)) platform = "linux";
    else if (/\.apk$/i.test(filename)) platform = "android";
    else if (/\.ipa$/i.test(filename)) platform = "ios";

    return {
      version: version,
      channel: channel || "unknown",
      platform: platform,
      filename: filename,
    };
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a.channel-dl-btn, a.arch-item") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (!href.startsWith("http")) return;

    var info = parseDownloadInfo(href, a);
    if (typeof window.__oa_track === "function") {
      window.__oa_track("dl", info);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
      translateStaticHTML();
    });
  } else {
    init();
    translateStaticHTML();
  }
})();
