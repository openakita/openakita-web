(function () {
  const SUPPORTED_LANGS = ["zh", "en", "ja", "ko", "ru", "fr", "de"];
  const LANG_TO_LOCALE = {
    zh: "zh-CN",
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    ru: "ru-RU",
    fr: "fr-FR",
    de: "de-DE",
  };
  const AUTO_TRANSLATE_SUPPORTED = new Set(["en", "ja", "ko", "ru", "fr", "de"]);
  const AUTO_TRANSLATE_CACHE_KEY = "openakita_auto_i18n_cache_v1";
  const AUTO_TRANSLATE_SEPARATOR = "[[[OPENAKITA_SEP]]]";
  const PREBUILT_TRANSLATION_CACHE_URL = "/assets/i18n/prebuilt_cache.json";
  const AUTO_TRANSLATE_SKIP_IDS = new Set([
    "latestReleaseVersion",
    "latestReleaseDate",
    "windowsAssetName",
    "macAssetName",
    "linuxAssetName",
  ]);

  const MESSAGES = {
    zh: {
      common: {
        navToggle: "打开导航",
        language: "语言",
        nav: {
          home: "首页",
          download: "下载",
          tutorials: "教程",
          about: "关于我们",
          github: "GitHub",
        },
        release: {
          loading: "加载中...",
          noAssets: "当前版本未附带构建产物，请前往 Releases 页面查看历史版本。",
          viewReleases: "请查看 GitHub Releases",
          openReleases: "打开 Releases 查看下载文件",
          loadingAssets: "正在读取可下载文件...",
          platformMissing: "当前版本未找到对应安装包，已跳转 Releases。",
        },
        copy: {
          copy: "复制",
          copied: "已复制",
          failed: "复制失败",
        },
      },
      home: {
        meta: {
          title: "OpenAkita - 自进化 AI Agent 官网",
          description:
            "OpenAkita 官方网站：一个会自学习、会自检修复、永不放弃的 AI Agent。提供下载、配置教程与文档入口。",
        },
        hero: {
          title: "一个你睡觉时还在变强的 AI Agent",
          desc: "OpenAkita 会自主学习技能、自检修复并持续进化。3 分钟完成配置，填入 API Key 即可使用。",
          btnDownload: "下载桌面版",
          btnSetup: "3 分钟配置教程",
          btnTutorials: "全部教程",
        },
        release: {
          link: "查看 Release 详情",
        },
        releaseTitle: "发布信息",
      },
      download: {
        meta: {
          title: "下载 OpenAkita - Desktop / CLI / Source",
          description: "OpenAkita 下载页面：Desktop 安装包、PyPI CLI 安装、源码部署和一键脚本。",
        },
        hero: {
          title: "下载与安装 OpenAkita",
          desc: "官方支持 Desktop、CLI、源码部署三种方式。你可以从简单到深入逐步切换。",
        },
        buttons: {
          latest: "查看全部安装包",
          notes: "Release 说明",
        },
        cards: {
          desktop: {
            title: "Desktop 安装包（Win / macOS / Linux）",
            desc: "只保留三端最新安装包入口，按你的系统直接下载即可。",
          },
          cli: {
            title: "PyPI CLI 安装",
            desc: "适合命令行用户与自动化部署，步骤最短。",
            btn: "查看安装教程",
          },
          source: {
            title: "源码安装",
            desc: "适合需要二次开发、定制构建和自托管流程的团队。",
          },
        },
      },
      tutorials: {
        meta: {
          title: "OpenAkita 教程中心 - 图文与视频",
          description:
            "OpenAkita 官方教程中心：安装配置、IM 通道接入、LLM 端点与 API Key 配置，包含图文和视频入口。",
        },
        hero: {
          title: "教程中心：图文 + 视频",
          desc: "覆盖安装、IM 通道和 LLM 端点配置。",
        },
      },
      setup: {
        meta: {
          title: "OpenAkita 安装教程 - Desktop 与 CLI",
          description:
            "OpenAkita 安装配置教程：Desktop 图形化安装、PyPI 命令行安装、源码安装与首次启动验证。",
        },
        hero: {
          title: "AI 助手安装与初始配置",
          desc: "从安装到首次验证的完整路径。",
        },
        side: ["教程概览", "环境要求", "方式一：Desktop", "方式二：PyPI", "方式三：源码", "首次启动验证", "视频教程", "参考文档"],
      },
      im: {
        meta: {
          title: "OpenAkita IM 通道配置教程",
          description:
            "OpenAkita IM 通道配置教程：Telegram、飞书、钉钉、企业微信、QQ 的平台申请与配置流程。",
        },
        hero: {
          title: "IM 通道配置与平台端申请",
          desc: "覆盖平台申请步骤与 OpenAkita `.env` 配置。",
        },
        side: ["平台概览", "Telegram", "飞书", "钉钉", "企业微信", "QQ OneBot", "语音转写", "视频教程"],
      },
      llm: {
        meta: {
          title: "OpenAkita LLM 端点与 API Key 配置教程",
          description:
            "OpenAkita LLM 教程：API Key 申请、.env 配置、llm_endpoints.json 多端点与能力路由设置。",
        },
        hero: {
          title: "LLM 端点与 API Key 配置",
          desc: "构建可容灾、可扩展的模型访问层。",
        },
        side: ["配置概览", "API Key 申请", ".env 配置", "llm_endpoints.json", "能力路由策略", "连通性验证", "视频教程"],
      },
      about: {
        meta: {
          title: "关于 OpenAkita - 自进化 AI Agent 项目",
          description: "OpenAkita 项目介绍：愿景、架构方向、开源协作方式与社区入口。",
        },
        hero: {
          title: "关于我们",
          desc: "OpenAkita 是一个自进化 AI Agent 项目，目标是让 Agent 在真实生产场景可部署、可协作、可持续进化。",
        },
      },
    },
    en: {
      common: {
        navToggle: "Open navigation",
        language: "Language",
        nav: {
          home: "Home",
          download: "Download",
          tutorials: "Tutorials",
          about: "About",
          github: "GitHub",
        },
        release: {
          loading: "Loading...",
          noAssets: "No packaged artifacts found for this release. Check historical releases.",
          viewReleases: "View GitHub Releases",
          openReleases: "Open Releases downloads",
          loadingAssets: "Loading downloadable assets...",
          platformMissing: "Matching package not found in this release. Open Releases.",
        },
        copy: {
          copy: "Copy",
          copied: "Copied",
          failed: "Copy failed",
        },
      },
      home: {
        meta: {
          title: "OpenAkita - Self-Evolving AI Agent",
          description:
            "Official OpenAkita website for a self-evolving AI Agent that learns, self-repairs, and never gives up.",
        },
        hero: {
          title: "An AI Agent That Gets Better While You Sleep",
          desc: "OpenAkita learns skills, fixes itself, and keeps evolving. Setup takes about 3 minutes.",
          btnDownload: "Download Desktop",
          btnSetup: "3-Min Setup Guide",
          btnTutorials: "All Tutorials",
        },
        release: {
          link: "View Release details",
        },
        releaseTitle: "Release Info",
      },
      download: {
        meta: {
          title: "Download OpenAkita - Desktop / CLI / Source",
          description: "OpenAkita downloads: Desktop packages, PyPI CLI install, source deployment, and quick scripts.",
        },
        hero: {
          title: "Download and Install OpenAkita",
          desc: "Choose Desktop, CLI, or source deployment based on your team workflow.",
        },
        buttons: {
          latest: "All Packages",
          notes: "Release Notes",
        },
        cards: {
          desktop: {
            title: "Desktop Packages (Win / macOS / Linux)",
            desc: "Only the latest packages for three platforms are shown.",
          },
          cli: {
            title: "PyPI CLI Install",
            desc: "Best for CLI workflows and automation.",
            btn: "View Setup Guide",
          },
          source: {
            title: "Source Installation",
            desc: "Best for custom development and self-hosted pipelines.",
          },
        },
      },
      tutorials: {
        meta: {
          title: "OpenAkita Tutorials - Text and Video",
          description: "Official OpenAkita tutorials for setup, IM channels, and LLM endpoint/API key configuration.",
        },
        hero: {
          title: "Tutorial Center",
          desc: "Covers setup, IM channels, and LLM endpoint configuration.",
        },
      },
      setup: {
        meta: {
          title: "OpenAkita Setup Guide - Desktop and CLI",
          description: "OpenAkita setup tutorial for Desktop, CLI, and source installation.",
        },
        hero: {
          title: "Assistant Setup and Initial Configuration",
          desc: "A complete path from installation to first-run validation.",
        },
        side: ["Overview", "Requirements", "Option 1: Desktop", "Option 2: PyPI", "Option 3: Source", "First-Run Validation", "Video", "References"],
      },
      im: {
        meta: {
          title: "OpenAkita IM Channel Configuration Guide",
          description: "Platform onboarding and configuration for Telegram, Feishu, DingTalk, WeCom, and QQ.",
        },
        hero: {
          title: "IM Channel Config and Platform Onboarding",
          desc: "Covers platform onboarding and `.env` configuration in OpenAkita.",
        },
        side: ["Platform Overview", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ OneBot", "Voice", "Video"],
      },
      llm: {
        meta: {
          title: "OpenAkita LLM Endpoints and API Key Guide",
          description: "API key onboarding, `.env` setup, and `llm_endpoints.json` configuration.",
        },
        hero: {
          title: "LLM Endpoints and API Key Configuration",
          desc: "Build a resilient and scalable model access layer.",
        },
        side: ["Overview", "API Key", ".env", "llm_endpoints.json", "Capability Routing", "Validation", "Video"],
      },
      about: {
        meta: {
          title: "About OpenAkita - Self-Evolving AI Agent Project",
          description: "About OpenAkita: project vision, architecture direction, and community participation.",
        },
        hero: {
          title: "About Us",
          desc: "OpenAkita is a self-evolving AI Agent project built for real production scenarios.",
        },
      },
    },
    ja: {
      common: {
        navToggle: "ナビを開く",
        language: "言語",
        nav: { home: "ホーム", download: "ダウンロード", tutorials: "チュートリアル", about: "概要", github: "GitHub" },
      },
      home: { hero: { title: "オープンソース AI Agent サイト", desc: "セットアップから本番運用までをカバーします。" } },
      download: { hero: { title: "OpenAkita をダウンロード", desc: "Desktop / CLI / Source の 3 つの導入方法を提供します。" } },
      tutorials: { hero: { title: "チュートリアルセンター", desc: "インストール、IM 連携、LLM 設定を網羅。" } },
      setup: {
        hero: { title: "初期セットアップ", desc: "Desktop と CLI の導入手順。" },
        side: ["概要", "要件", "方法1: Desktop", "方法2: PyPI", "方法3: ソース", "初回検証", "動画", "参考資料"],
      },
      im: {
        hero: { title: "IM チャネル設定", desc: "各プラットフォームの申請と接続手順。" },
        side: ["プラットフォーム概要", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ OneBot", "音声変換", "動画"],
      },
      llm: {
        hero: { title: "LLM エンドポイント設定", desc: "API Key とエンドポイント構成を設定。" },
        side: ["概要", "API Key", ".env", "llm_endpoints.json", "ルーティング", "検証", "動画"],
      },
      about: { hero: { title: "私たちについて", desc: "OpenAkita のビジョンとコミュニティ。" } },
    },
    ko: {
      common: {
        navToggle: "탐색 열기",
        language: "언어",
        nav: { home: "홈", download: "다운로드", tutorials: "튜토리얼", about: "소개", github: "GitHub" },
      },
      home: { hero: { title: "오픈소스 AI Agent 사이트", desc: "설치부터 운영까지 한 번에 안내합니다." } },
      download: { hero: { title: "OpenAkita 다운로드", desc: "Desktop / CLI / Source 3가지 설치 경로를 지원합니다." } },
      tutorials: { hero: { title: "튜토리얼 센터", desc: "설치, IM 연동, LLM 설정을 다룹니다." } },
      setup: {
        hero: { title: "초기 설정", desc: "Desktop 및 CLI 설치 가이드." },
        side: ["개요", "요구 사항", "방법 1: Desktop", "방법 2: PyPI", "방법 3: 소스", "최초 검증", "영상", "참고 자료"],
      },
      im: {
        hero: { title: "IM 채널 설정", desc: "플랫폼 신청 및 연동 절차." },
        side: ["플랫폼 개요", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ OneBot", "음성 전사", "영상"],
      },
      llm: {
        hero: { title: "LLM 엔드포인트 설정", desc: "API Key 및 엔드포인트 구성." },
        side: ["개요", "API Key", ".env", "llm_endpoints.json", "라우팅", "검증", "영상"],
      },
      about: { hero: { title: "소개", desc: "OpenAkita 비전과 커뮤니티." } },
    },
    ru: {
      common: {
        navToggle: "Открыть навигацию",
        language: "Язык",
        nav: { home: "Главная", download: "Скачать", tutorials: "Руководства", about: "О проекте", github: "GitHub" },
      },
      home: { hero: { title: "Сайт open-source AI Agent", desc: "От настройки до продакшена в одном потоке." } },
      download: { hero: { title: "Скачать OpenAkita", desc: "Доступны Desktop, CLI и исходная установка." } },
      tutorials: { hero: { title: "Центр руководств", desc: "Установка, IM-каналы и настройка LLM." } },
      setup: {
        hero: { title: "Начальная установка", desc: "Пошаговый гайд для Desktop и CLI." },
        side: ["Обзор", "Требования", "Вариант 1: Desktop", "Вариант 2: PyPI", "Вариант 3: Source", "Первая проверка", "Видео", "Ссылки"],
      },
      im: {
        hero: { title: "Настройка IM-каналов", desc: "Подключение платформ и конфигурация." },
        side: ["Обзор платформ", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ OneBot", "Голос", "Видео"],
      },
      llm: {
        hero: { title: "Настройка LLM endpoints", desc: "API Key и отказоустойчивые endpoints." },
        side: ["Обзор", "API Key", ".env", "llm_endpoints.json", "Маршрутизация", "Проверка", "Видео"],
      },
      about: { hero: { title: "О нас", desc: "Видение OpenAkita и сообщество." } },
    },
    fr: {
      common: {
        navToggle: "Ouvrir la navigation",
        language: "Langue",
        nav: { home: "Accueil", download: "Télécharger", tutorials: "Tutoriels", about: "À propos", github: "GitHub" },
      },
      home: { hero: { title: "Site open source AI Agent", desc: "Du setup à la production, en un seul parcours." } },
      download: { hero: { title: "Télécharger OpenAkita", desc: "Installation Desktop, CLI et source." } },
      tutorials: { hero: { title: "Centre de tutoriels", desc: "Installation, canaux IM et configuration LLM." } },
      setup: {
        hero: { title: "Installation initiale", desc: "Guide Desktop et CLI étape par étape." },
        side: ["Aperçu", "Prérequis", "Option 1 : Desktop", "Option 2 : PyPI", "Option 3 : Source", "Vérification", "Vidéo", "Références"],
      },
      im: {
        hero: { title: "Configuration des canaux IM", desc: "Onboarding des plateformes et intégration." },
        side: ["Aperçu plateforme", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ OneBot", "Voix", "Vidéo"],
      },
      llm: {
        hero: { title: "Configuration des endpoints LLM", desc: "API Key et stratégie de bascule." },
        side: ["Aperçu", "API Key", ".env", "llm_endpoints.json", "Routage", "Validation", "Vidéo"],
      },
      about: { hero: { title: "À propos", desc: "Vision OpenAkita et communauté." } },
    },
    de: {
      common: {
        navToggle: "Navigation öffnen",
        language: "Sprache",
        nav: { home: "Start", download: "Download", tutorials: "Tutorials", about: "Über uns", github: "GitHub" },
      },
      home: { hero: { title: "Open-Source AI-Agent Website", desc: "Von Setup bis Produktion in einem Ablauf." } },
      download: { hero: { title: "OpenAkita herunterladen", desc: "Desktop-, CLI- und Source-Installation verfügbar." } },
      tutorials: { hero: { title: "Tutorial-Zentrum", desc: "Installation, IM-Kanäle und LLM-Konfiguration." } },
      setup: {
        hero: { title: "Ersteinrichtung", desc: "Schritt-für-Schritt für Desktop und CLI." },
        side: ["Überblick", "Voraussetzungen", "Option 1: Desktop", "Option 2: PyPI", "Option 3: Source", "Erstprüfung", "Video", "Referenzen"],
      },
      im: {
        hero: { title: "IM-Kanal-Konfiguration", desc: "Plattform-Onboarding und Integration." },
        side: ["Plattformüberblick", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ OneBot", "Sprache", "Video"],
      },
      llm: {
        hero: { title: "LLM-Endpoint-Konfiguration", desc: "API-Keys und Failover-Endpunkte." },
        side: ["Überblick", "API Key", ".env", "llm_endpoints.json", "Routing", "Validierung", "Video"],
      },
      about: { hero: { title: "Über uns", desc: "Vision und Community von OpenAkita." } },
    },
  };

  function getNestedValue(obj, key) {
    if (!obj || !key) return undefined;
    return key.split(".").reduce(function (acc, part) {
      return acc && typeof acc === "object" ? acc[part] : undefined;
    }, obj);
  }

  let currentLanguage = "zh";

  function t(key) {
    const current = getNestedValue(MESSAGES[currentLanguage], key);
    if (current !== undefined && current !== null) return current;
    const english = getNestedValue(MESSAGES.en, key);
    if (english !== undefined && english !== null) return english;
    const chinese = getNestedValue(MESSAGES.zh, key);
    if (chinese !== undefined && chinese !== null) return chinese;
    return undefined;
  }

  function normalizeLanguageTag(languageTag) {
    if (!languageTag) return "zh";
    const lower = languageTag.toLowerCase();
    const short = lower.split("-")[0];
    return SUPPORTED_LANGS.includes(short) ? short : "zh";
  }

  function detectLanguage() {
    const saved = localStorage.getItem("openakita_language");
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    const browserCandidates = Array.isArray(navigator.languages) && navigator.languages.length > 0 ? navigator.languages : [navigator.language || "zh-CN"];
    for (const tag of browserCandidates) {
      const normalized = normalizeLanguageTag(tag);
      if (SUPPORTED_LANGS.includes(normalized)) return normalized;
    }
    return "zh";
  }

  function resolvePageKey() {
    const path = (window.location.pathname || "").toLowerCase();
    if (path.includes("/tutorials/setup-install")) return "setup";
    if (path.includes("/tutorials/im-channels")) return "im";
    if (path.includes("/tutorials/llm-endpoints")) return "llm";
    if (path === "/tutorials" || path.startsWith("/tutorials/")) return "tutorials";
    if (path === "/download" || path.startsWith("/download/")) return "download";
    if (path === "/about" || path.startsWith("/about/")) return "about";
    return "home";
  }

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el && typeof value === "string") el.textContent = value;
  }

  function setHtml(selector, value) {
    const el = document.querySelector(selector);
    if (el && typeof value === "string") el.innerHTML = value;
  }

  function setAttr(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el && typeof value === "string") el.setAttribute(attr, value);
  }

  function setInlineLabel(selector, value) {
    const el = document.querySelector(selector);
    if (!el || typeof value !== "string") return;
    const textNode = Array.from(el.childNodes).find(function (node) {
      return node.nodeType === 3 && node.textContent.trim().length > 0;
    });
    if (textNode) {
      textNode.textContent = " " + value;
      return;
    }
    el.appendChild(document.createTextNode(" " + value));
  }

  function setList(selector, values) {
    const nodes = document.querySelectorAll(selector);
    values.forEach(function (value, index) {
      if (nodes[index] && typeof value === "string") nodes[index].textContent = value;
    });
  }

  function tArray(key) {
    const value = t(key);
    return Array.isArray(value) ? value : [];
  }
  function applyMeta(pageKey) {
    const title = t(pageKey + ".meta.title");
    const description = t(pageKey + ".meta.description");
    if (title) document.title = title;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta && description) descMeta.setAttribute("content", description);
  }

  function applyCommonTexts() {
    setAttr(".nav-toggle", "aria-label", t("common.navToggle"));
    setText('.main-nav a[data-nav="home"]', t("common.nav.home"));
    setText('.main-nav a[data-nav="download"]', t("common.nav.download"));
    setText('.main-nav a[data-nav="tutorials"]', t("common.nav.tutorials"));
    setText('.main-nav a[data-nav="about"]', t("common.nav.about"));
    const githubLink = document.querySelector('.main-nav a[href*="github.com/openakita/openakita"]');
    if (githubLink) githubLink.textContent = t("common.nav.github");
    setText(".lang-label", t("common.language"));
  }

  function applyHomeTexts() {
    setText(".hero h1", t("home.hero.title"));
    setText(".hero .hero-grid > div.reveal p", t("home.hero.desc"));
    setInlineLabel("#downloadDesktopButton", t("home.hero.btnDownload"));
    setInlineLabel('.hero .hero-actions a[href="/tutorials/setup-install/"]', t("home.hero.btnSetup"));
    setInlineLabel('.hero .hero-actions a[href="/tutorials/"]', t("home.hero.btnTutorials"));
    setText(".hero-panel h3", t("home.releaseTitle"));
    setText("#latestReleaseNotesLink", t("home.release.link"));
  }

  function applyDownloadTexts() {
    setText(".page-hero h1", t("download.hero.title"));
    setText(".page-hero p", t("download.hero.desc"));
    setInlineLabel("#downloadDesktopButton", t("download.buttons.latest"));
    setText("#latestReleaseNotesLink", t("download.buttons.notes"));
    const releaseListFirst = document.querySelector("#releaseAssetsList li");
    if (releaseListFirst && !releaseListFirst.querySelector("a")) {
      releaseListFirst.textContent = t("common.release.loadingAssets");
    }
    setText("main > section:nth-of-type(2) .card:nth-child(1) h3", t("download.cards.desktop.title"));
    setText("main > section:nth-of-type(2) .card:nth-child(1) p", t("download.cards.desktop.desc"));
    setText("main > section:nth-of-type(2) .card:nth-child(2) h3", t("download.cards.cli.title"));
    setText("main > section:nth-of-type(2) .card:nth-child(2) p", t("download.cards.cli.desc"));
    setText("main > section:nth-of-type(2) .card:nth-child(2) .actions a", t("download.cards.cli.btn"));
    setText("main > section:nth-of-type(2) .card:nth-child(3) h3", t("download.cards.source.title"));
    setText("main > section:nth-of-type(2) .card:nth-child(3) p", t("download.cards.source.desc"));
  }

  function applyTutorialIndexTexts() {
    setText(".page-hero h1", t("tutorials.hero.title"));
    setText(".page-hero p", t("tutorials.hero.desc"));
  }

  function applySetupTexts() {
    setText(".page-hero h1", t("setup.hero.title"));
    setText(".page-hero p", t("setup.hero.desc"));
    setList(".side-nav a", tArray("setup.side"));
  }

  function applyImTexts() {
    setText(".page-hero h1", t("im.hero.title"));
    setText(".page-hero p", t("im.hero.desc"));
    setList(".side-nav a", tArray("im.side"));
  }

  function applyLlmTexts() {
    setText(".page-hero h1", t("llm.hero.title"));
    setText(".page-hero p", t("llm.hero.desc"));
    setList(".side-nav a", tArray("llm.side"));
  }

  function applyAboutTexts() {
    setText(".page-hero h1", t("about.hero.title"));
    setText(".page-hero p", t("about.hero.desc"));
  }

  function applyPageTexts(pageKey) {
    if (pageKey === "home") applyHomeTexts();
    if (pageKey === "download") applyDownloadTexts();
    if (pageKey === "tutorials") applyTutorialIndexTexts();
    if (pageKey === "setup") applySetupTexts();
    if (pageKey === "im") applyImTexts();
    if (pageKey === "llm") applyLlmTexts();
    if (pageKey === "about") applyAboutTexts();
  }

  function injectLanguageSwitcher(pageKey) {
    const nav = document.querySelector(".main-nav");
    if (!nav || nav.querySelector(".lang-switch")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "lang-switch";
    const label = document.createElement("label");
    label.className = "lang-label";
    label.setAttribute("for", "languageSelect");
    label.textContent = t("common.language");

    const select = document.createElement("select");
    select.className = "lang-select";
    select.id = "languageSelect";

    const options = [
      { value: "zh", label: "中文" },
      { value: "en", label: "English" },
      { value: "ja", label: "日本語" },
      { value: "ko", label: "한국어" },
      { value: "ru", label: "Русский" },
      { value: "fr", label: "Français" },
      { value: "de", label: "Deutsch" },
    ];

    options.forEach(function (item) {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      select.appendChild(option);
    });

    select.value = currentLanguage;
    select.addEventListener("change", function () {
      currentLanguage = normalizeLanguageTag(select.value);
      localStorage.setItem("openakita_language", currentLanguage);
      document.documentElement.lang = LANG_TO_LOCALE[currentLanguage] || "en-US";
      applyMeta(pageKey);
      applyCommonTexts();
      applyPageTexts(pageKey);
      enhanceCodeBlocks();
      loadLatestRelease();
      void autoTranslateSiteContent();
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);
    nav.appendChild(wrapper);
  }

  function getCopyButtonLabel(state) {
    if (state === "copied") return t("common.copy.copied") || "Copied";
    if (state === "failed") return t("common.copy.failed") || "Copy failed";
    return t("common.copy.copy") || "Copy";
  }

  async function copyToClipboardText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!ok) {
      throw new Error("copy_failed");
    }
  }

  function enhanceCodeBlocks() {
    const blocks = document.querySelectorAll(".code-block");

    blocks.forEach(function (block) {
      const codeNode = block.querySelector("code");
      if (!codeNode) return;

      block.classList.add("has-copy");
      let btn = block.querySelector(".code-copy-btn");

      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "code-copy-btn";
        btn.dataset.state = "idle";
        block.appendChild(btn);

        btn.addEventListener("click", async function () {
          const text = codeNode.textContent || "";
          btn.dataset.state = "idle";
          try {
            await copyToClipboardText(text.trimEnd());
            btn.dataset.state = "copied";
          } catch (error) {
            btn.dataset.state = "failed";
          }
          btn.textContent = getCopyButtonLabel(btn.dataset.state);
          window.setTimeout(function () {
            btn.dataset.state = "idle";
            btn.textContent = getCopyButtonLabel("idle");
          }, 1600);
        });
      }

      if (btn.dataset.state !== "copied" && btn.dataset.state !== "failed") {
        btn.dataset.state = "idle";
      }
      btn.textContent = getCopyButtonLabel(btn.dataset.state || "idle");
    });
  }

  let contentTextRegistry = null;
  let autoTranslateCache = null;
  let autoTranslateRunId = 0;
  let prebuiltCacheMerged = false;
  let prebuiltCachePromise = null;

  function loadAutoTranslateCache() {
    if (autoTranslateCache) return autoTranslateCache;
    try {
      autoTranslateCache = JSON.parse(localStorage.getItem(AUTO_TRANSLATE_CACHE_KEY) || "{}");
    } catch (error) {
      autoTranslateCache = {};
    }
    return autoTranslateCache;
  }

  function saveAutoTranslateCache() {
    if (!autoTranslateCache) return;
    try {
      localStorage.setItem(AUTO_TRANSLATE_CACHE_KEY, JSON.stringify(autoTranslateCache));
    } catch (error) {
      // Ignore quota errors and keep in-memory cache.
    }
  }

  async function ensurePrebuiltTranslateCacheLoaded() {
    if (prebuiltCacheMerged) return;
    if (!prebuiltCachePromise) {
      prebuiltCachePromise = (async function () {
        try {
          const response = await fetch(PREBUILT_TRANSLATION_CACHE_URL, { cache: "force-cache" });
          if (!response.ok) return;
          const payload = await response.json();
          const prebuilt = payload && payload.cache && typeof payload.cache === "object" ? payload.cache : null;
          if (!prebuilt) return;

          const cache = loadAutoTranslateCache();
          AUTO_TRANSLATE_SUPPORTED.forEach(function (lang) {
            const fromFile = prebuilt[lang];
            if (!fromFile || typeof fromFile !== "object") return;
            cache[lang] = cache[lang] || {};
            Object.keys(fromFile).forEach(function (source) {
              cache[lang][source] = fromFile[source];
            });
          });
          saveAutoTranslateCache();
        } catch (error) {
          // Keep runtime translation fallback when prebuilt cache is unavailable.
        } finally {
          prebuiltCacheMerged = true;
        }
      })();
    }
    await prebuiltCachePromise;
  }

  function collectContentTextNodes() {
    const roots = [];
    const main = document.querySelector("main");
    const footer = document.querySelector(".site-footer");
    if (main) roots.push(main);
    if (footer) roots.push(footer);

    const entries = [];
    const meaningfulPattern = /[\u4e00-\u9fffA-Za-z]/;

    roots.forEach(function (root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();

      while (node) {
        const parent = node.parentElement;
        if (!parent) {
          node = walker.nextNode();
          continue;
        }

        if (parent.closest("script,style,noscript,textarea,code,pre,.code-block")) {
          node = walker.nextNode();
          continue;
        }

        const idCarrier = parent.closest("[id]");
        if (idCarrier && AUTO_TRANSLATE_SKIP_IDS.has(idCarrier.id)) {
          node = walker.nextNode();
          continue;
        }

        const raw = node.nodeValue || "";
        const match = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
        if (!match) {
          node = walker.nextNode();
          continue;
        }

        const prefix = match[1];
        const core = match[2];
        const suffix = match[3];

        if (!core || !meaningfulPattern.test(core) || core.trim().startsWith("©")) {
          node = walker.nextNode();
          continue;
        }

        entries.push({
          node: node,
          prefix: prefix,
          core: core,
          suffix: suffix,
        });

        node = walker.nextNode();
      }
    });

    return entries;
  }

  function restoreOriginalContentText() {
    if (!contentTextRegistry) return;
    contentTextRegistry.forEach(function (entry) {
      if (!entry || !entry.node || entry.node.nodeType !== Node.TEXT_NODE) return;
      entry.node.nodeValue = entry.prefix + entry.core + entry.suffix;
    });
  }

  async function requestGoogleTranslateBatch(texts, targetLanguage) {
    const query = encodeURIComponent(texts.join(AUTO_TRANSLATE_SEPARATOR));
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=" +
      encodeURIComponent(targetLanguage) +
      "&dt=t&q=" +
      query;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("translate_request_failed");
    }
    const payload = await response.json();
    const segments = Array.isArray(payload) && Array.isArray(payload[0]) ? payload[0] : [];
    const translated = segments
      .map(function (segment) {
        return Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : "";
      })
      .join("");
    const parts = translated.split(AUTO_TRANSLATE_SEPARATOR);
    if (parts.length !== texts.length) {
      throw new Error("translate_batch_split_failed");
    }
    return parts;
  }

  async function translateMissingTexts(sources, targetLanguage) {
    const translatedMap = {};
    const queue = sources.slice();

    while (queue.length > 0) {
      const batch = [];
      let charCount = 0;

      while (queue.length > 0) {
        const candidate = queue[0];
        const projected = charCount + candidate.length + AUTO_TRANSLATE_SEPARATOR.length;
        if (batch.length >= 24 || (batch.length > 0 && projected > 3200)) {
          break;
        }
        batch.push(queue.shift());
        charCount = projected;
      }

      if (batch.length === 0) {
        batch.push(queue.shift());
      }

      try {
        const translatedBatch = await requestGoogleTranslateBatch(batch, targetLanguage);
        batch.forEach(function (source, index) {
          translatedMap[source] = translatedBatch[index] || source;
        });
      } catch (error) {
        for (const source of batch) {
          try {
            const single = await requestGoogleTranslateBatch([source], targetLanguage);
            translatedMap[source] = single[0] || source;
          } catch (singleError) {
            translatedMap[source] = source;
          }
        }
      }
    }

    return translatedMap;
  }

  async function autoTranslateSiteContent() {
    const runId = ++autoTranslateRunId;

    if (!contentTextRegistry) {
      contentTextRegistry = collectContentTextNodes();
    }

    restoreOriginalContentText();

    if (currentLanguage === "zh" || !AUTO_TRANSLATE_SUPPORTED.has(currentLanguage)) {
      return;
    }

    await ensurePrebuiltTranslateCacheLoaded();
    if (runId !== autoTranslateRunId) return;

    const cache = loadAutoTranslateCache();
    cache[currentLanguage] = cache[currentLanguage] || {};
    const langCache = cache[currentLanguage];

    const uniqueSources = Array.from(
      new Set(
        contentTextRegistry
          .map(function (entry) {
            return entry && typeof entry.core === "string" ? entry.core : "";
          })
          .filter(function (text) {
            return text.trim().length > 0;
          })
      )
    );

    const missingSources = uniqueSources.filter(function (source) {
      return !langCache[source];
    });

    if (missingSources.length > 0) {
      const translated = await translateMissingTexts(missingSources, currentLanguage);
      if (runId !== autoTranslateRunId) return;
      Object.keys(translated).forEach(function (source) {
        langCache[source] = translated[source];
      });
      saveAutoTranslateCache();
    }

    if (runId !== autoTranslateRunId) return;

    contentTextRegistry.forEach(function (entry) {
      if (!entry || !entry.node || entry.node.nodeType !== Node.TEXT_NODE) return;
      const translatedCore = langCache[entry.core] || entry.core;
      entry.node.nodeValue = entry.prefix + translatedCore + entry.suffix;
    });

    enhanceCodeBlocks();
  }

  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      const expanded = nav.classList.contains("open");
      navToggle.setAttribute("aria-expanded", String(expanded));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length > 0) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01 }
    );
    reveals.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  const yearNode = document.querySelector("[data-current-year]");
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

  const pageId = document.body.getAttribute("data-page");
  if (pageId) {
    const activeLink = document.querySelector('.main-nav a[data-nav="' + pageId + '"]');
    if (activeLink) {
      activeLink.classList.add("active");
    }
  }

  const pageKey = resolvePageKey();
  currentLanguage = detectLanguage();
  document.documentElement.lang = LANG_TO_LOCALE[currentLanguage] || "en-US";
  contentTextRegistry = collectContentTextNodes();

  applyMeta(pageKey);
  applyCommonTexts();
  applyPageTexts(pageKey);
  injectLanguageSwitcher(pageKey);
  enhanceCodeBlocks();

  function recoverBrokenSvgIcons() {
    const svgImages = document.querySelectorAll('img[src$=".svg"]');

    svgImages.forEach(function (img) {
      const originalSrc = img.getAttribute("src");
      if (!originalSrc) return;

      async function recover() {
        if (img.dataset.svgRecovered === "1") return;
        try {
          const response = await fetch(originalSrc, { cache: "no-store" });
          if (!response.ok) return;
          const svgText = await response.text();
          if (!svgText || svgText.indexOf("<svg") === -1) return;
          const blob = new Blob([svgText], { type: "image/svg+xml" });
          const objectUrl = URL.createObjectURL(blob);
          img.src = objectUrl;
          img.dataset.svgRecovered = "1";
        } catch (error) {
          // no-op: keep original src when recovery fails
        }
      }

      img.addEventListener("error", recover, { once: true });
      if (img.complete && img.naturalWidth === 0) {
        recover();
      }
    });
  }

  recoverBrokenSvgIcons();

  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(LANG_TO_LOCALE[currentLanguage] || "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      return "--";
    }
  }

  function formatAssetSize(asset) {
    return asset && asset.size ? (asset.size / 1024 / 1024).toFixed(1) + " MB" : "--";
  }

  function pickReleaseAsset(assets, patterns) {
    if (!Array.isArray(assets)) return null;
    for (const pattern of patterns) {
      const found = assets.find(function (asset) {
        const name = (asset && asset.name ? asset.name : "").toLowerCase();
        return pattern.test(name);
      });
      if (found) return found;
    }
    return null;
  }

  function applyPlatformAsset(platform, asset, fallbackUrl) {
    const btn = document.getElementById(platform.buttonId);
    const nameNode = document.getElementById(platform.nameId);
    if (!btn || !nameNode) return;

    if (asset) {
      btn.href = asset.browser_download_url;
      nameNode.textContent = asset.name + " (" + formatAssetSize(asset) + ")";
    } else {
      btn.href = fallbackUrl;
      nameNode.textContent = t("common.release.platformMissing");
    }
  }

  async function loadLatestRelease() {
    const versionNode = document.getElementById("latestReleaseVersion");
    const dateNode = document.getElementById("latestReleaseDate");
    const notesNode = document.getElementById("latestReleaseNotesLink");
    const assetsNode = document.getElementById("releaseAssetsList");
    const desktopBtn = document.getElementById("downloadDesktopButton");

    if (!versionNode && !assetsNode && !desktopBtn) {
      return;
    }

    const fallbackUrl = "https://github.com/openakita/openakita/releases";

    try {
      if (versionNode && !versionNode.textContent.trim()) {
        versionNode.textContent = t("common.release.loading");
      }

      const response = await fetch("https://api.github.com/repos/openakita/openakita/releases/latest", {
        headers: {
          Accept: "application/vnd.github+json",
        },
      });

      if (!response.ok) {
        throw new Error("release_request_failed");
      }

      const release = await response.json();
      const version = release.tag_name || "latest";
      const published = release.published_at ? formatDate(release.published_at) : "--";
      const htmlUrl = release.html_url || fallbackUrl;
      const assets = Array.isArray(release.assets) ? release.assets : [];

      if (versionNode) versionNode.textContent = version;
      if (dateNode) dateNode.textContent = published;
      if (notesNode) notesNode.href = htmlUrl;
      if (desktopBtn) desktopBtn.href = htmlUrl;

      applyPlatformAsset(
        {
          buttonId: "downloadWindowsBtn",
          nameId: "windowsAssetName",
        },
        pickReleaseAsset(assets, [/\.exe$/i, /\.msi$/i, /windows/i]),
        htmlUrl
      );
      applyPlatformAsset(
        {
          buttonId: "downloadMacBtn",
          nameId: "macAssetName",
        },
        pickReleaseAsset(assets, [/\.dmg$/i, /\.pkg$/i, /mac|darwin|osx/i]),
        htmlUrl
      );
      applyPlatformAsset(
        {
          buttonId: "downloadLinuxBtn",
          nameId: "linuxAssetName",
        },
        pickReleaseAsset(assets, [/\.appimage$/i, /\.deb$/i, /\.rpm$/i, /linux/i, /\.tar\.gz$/i]),
        htmlUrl
      );

      if (assetsNode) {
        assetsNode.innerHTML = "";

        if (assets.length === 0) {
          const li = document.createElement("li");
          li.textContent = t("common.release.noAssets");
          assetsNode.appendChild(li);
        } else {
          assets.slice(0, 8).forEach(function (asset) {
            const li = document.createElement("li");
            const a = document.createElement("a");
            const sizeMb = asset.size ? (asset.size / 1024 / 1024).toFixed(1) + " MB" : "--";
            a.href = asset.browser_download_url;
            a.target = "_blank";
            a.rel = "noreferrer noopener";
            a.textContent = asset.name + " (" + sizeMb + ")";
            li.appendChild(a);
            assetsNode.appendChild(li);
          });
        }
      }
    } catch (error) {
      if (versionNode) versionNode.textContent = t("common.release.viewReleases");
      if (dateNode) dateNode.textContent = "--";
      if (notesNode) notesNode.href = fallbackUrl;
      if (desktopBtn) desktopBtn.href = fallbackUrl;
      applyPlatformAsset({ buttonId: "downloadWindowsBtn", nameId: "windowsAssetName" }, null, fallbackUrl);
      applyPlatformAsset({ buttonId: "downloadMacBtn", nameId: "macAssetName" }, null, fallbackUrl);
      applyPlatformAsset({ buttonId: "downloadLinuxBtn", nameId: "linuxAssetName" }, null, fallbackUrl);
      if (assetsNode) {
        assetsNode.innerHTML =
          '<li><a href="https://github.com/openakita/openakita/releases" target="_blank" rel="noreferrer noopener">' +
          t("common.release.openReleases") +
          "</a></li>";
      }
    }
  }

  loadLatestRelease();
  void autoTranslateSiteContent();
})();
