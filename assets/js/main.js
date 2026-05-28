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
  const CONTENT_TRANSLATE_LANGS = new Set(["en", "ja", "ko", "ru", "fr", "de"]);
  const CONTENT_SKIP_IDS = new Set([
    "latestReleaseVersion",
    "latestReleaseDate",
    "windowsAssetName",
    "macAssetName",
    "linuxAssetName",
    "heroTypedTitle",
    "heroSloganText",
  ]);

  const MESSAGES = {
    zh: {
      common: {
        navToggle: "打开导航",
        language: "语言",
        nav: {
          home: "首页",
          download: "下载",
          services: "服务",
          scenarios: "应用场景",
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
        footerTagline: "Self-Evolving AI Agent：自主学习，永不放弃。",
        footer: {
          quickLinks: "快速链接",
          followUs: "关注我们",
          contactUs: "联系我们",
          download: "下载",
          services: "服务",
          tutorials: "教程",
          about: "关于我们",
          bizEmail: "商务：",
          techEmail: "技术：",
          wxOfficial: "微信公众号",
          terms: "服务条款",
          privacy: "隐私政策",
        },
      },
      home: {
        meta: {
          title: "OpenAkita - 自进化 AI Agent 官网",
          description:
            "OpenAkita 官方网站：一个会自学习、会自检修复、永不放弃的 AI Agent。提供下载、配置教程与文档入口。",
        },
        hero: {
          title: "让私人AI随时陪伴",
          slogan: "一直在身边，一直在变强。",
          desc: "填一个 API Key，剩下的交给 OpenAkita。",
          btnDownload: "立即下载",
          btnSetup: "3 分钟开始",
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
            "OpenAkita 官方教程中心：安装配置、IM 通道接入、QQ、微信、LLM 端点配置，包含图文和视频入口。",
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
        side: ["教程概览", "环境要求", "安装OpenAkita", "启动验证"],
      },
      im: {
        meta: {
          title: "OpenAkita IM 通道配置教程",
          description:
            "OpenAkita IM 通道配置教程：Telegram、飞书、钉钉、企业微信、QQ、微信的平台申请与配置流程。",
        },
        hero: {
          title: "IM 通道配置与平台端申请",
          desc: "覆盖平台申请步骤与 OpenAkita 配置，含 QQ 与微信。",
        },
        side: ["平台概览", "Telegram", "飞书", "钉钉", "企业微信", "QQ", "微信", "语音转写", "视频教程"],
      },
      llm: {
        meta: {
          title: "LLM 端点配置教程",
          description: "OpenAkita Desktop 上的 LLM 端点添加、服务商选择、多端点容灾与可选编译器/语音识别端点。",
        },
        hero: {
          title: "LLM 端点配置",
          desc: "在桌面端中管理 LLM 端点、服务商与多端点。",
        },
        side: ["概述", "添加端点", "支持的服务商", "多端点与 Failover", "编译器端点", "语音识别端点"],
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
      services: {
        meta: {
          title: "服务 - OpenAkita AI Agent 产品与解决方案",
          description: "OpenAkita 提供开源 AI Agent 框架、跨平台桌面应用和面向企业的商业定制服务。",
        },
        hero: {
          title: "产品与服务",
          desc: "从开源通用助手到企业级定制方案，OpenAkita 为不同场景提供灵活的 AI Agent 解决方案。",
        },
      },
      terms: {
        meta: {
          title: "服务条款 - OpenAkita",
          description: "OpenAkita 服务条款：使用范围、知识产权、免责声明及相关法律条款。",
        },
        hero: {
          title: "服务条款",
          desc: "最后更新日期：2026 年 3 月 11 日",
        },
      },
      privacy: {
        meta: {
          title: "隐私政策 - OpenAkita",
          description: "OpenAkita 隐私政策：数据收集、使用方式、用户权利及安全措施。",
        },
        hero: {
          title: "隐私政策",
          desc: "最后更新日期：2026 年 3 月 11 日",
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
          services: "Services",
          scenarios: "Use Cases",
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
        footerTagline: "Self-Evolving AI Agent: Learn, adapt, never give up.",
        footer: {
          quickLinks: "Quick Links",
          followUs: "Follow Us",
          contactUs: "Contact Us",
          download: "Download",
          services: "Services",
          tutorials: "Tutorials",
          about: "About",
          bizEmail: "Business: ",
          techEmail: "Tech: ",
          wxOfficial: "WeChat Official",
          terms: "Terms of Service",
          privacy: "Privacy Policy",
        },
      },
      home: {
        meta: {
          title: "OpenAkita - Self-Evolving AI Agent",
          description:
            "Official OpenAkita website for a self-evolving AI Agent that learns, self-repairs, and never gives up.",
        },
        hero: {
          title: "OpenAkita, Always by Your Side",
          slogan: "Always with you. Always getting stronger.",
          desc: "Bring one API key. OpenAkita handles the rest.",
          btnDownload: "Download Now",
          btnSetup: "Start in 3 Min",
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
          description:
            "Official OpenAkita tutorials for setup, IM channels, QQ, WeChat, and LLM endpoint configuration.",
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
        side: ["Overview", "Requirements", "Install OpenAkita", "Startup Validation"],
      },
      im: {
        meta: {
          title: "OpenAkita IM Channel Configuration Guide",
          description: "Platform onboarding and configuration for Telegram, Feishu, DingTalk, WeCom, QQ, and WeChat.",
        },
        hero: {
          title: "IM Channel Config and Platform Onboarding",
          desc: "Covers platform onboarding and configuration, including QQ and WeChat.",
        },
        side: ["Platform Overview", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ", "WeChat", "Voice", "Video"],
      },
      llm: {
        meta: {
          title: "LLM Endpoint Configuration Guide",
          description: "Add LLM endpoints in OpenAkita Desktop, pick providers, enable failover, and optional compiler/speech endpoints.",
        },
        hero: {
          title: "LLM Endpoint Configuration",
          desc: "Manage LLM endpoints, providers, and multiple endpoints in OpenAkita Desktop.",
        },
        side: ["Overview", "Add endpoint", "Supported providers", "Multi-endpoint & Failover", "Compiler endpoint", "Speech recognition"],
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
      services: {
        meta: {
          title: "Services - OpenAkita AI Agent Products & Solutions",
          description: "OpenAkita provides an open-source AI Agent framework, cross-platform desktop app, and enterprise customization services.",
        },
        hero: {
          title: "Products & Services",
          desc: "From an open-source general assistant to enterprise-grade custom solutions, OpenAkita delivers flexible AI Agent solutions for every scenario.",
        },
      },
      terms: {
        meta: {
          title: "Terms of Service - OpenAkita",
          description: "OpenAkita Terms of Service: scope of use, intellectual property, disclaimers, and legal provisions.",
        },
        hero: {
          title: "Terms of Service",
          desc: "Last updated: March 11, 2026",
        },
      },
      privacy: {
        meta: {
          title: "Privacy Policy - OpenAkita",
          description: "OpenAkita Privacy Policy: data collection, usage, user rights, and security measures.",
        },
        hero: {
          title: "Privacy Policy",
          desc: "Last updated: March 11, 2026",
        },
      },
    },
    ja: {
      common: {
        navToggle: "ナビを開く",
        language: "言語",
        nav: { home: "ホーム", download: "ダウンロード", services: "サービス", scenarios: "活用シーン", tutorials: "チュートリアル", about: "概要", github: "GitHub" },
        footerTagline: "Self-Evolving AI Agent：自ら学び、決して諦めない。",
        footer: {
          quickLinks: "クイックリンク",
          followUs: "フォロー",
          contactUs: "お問い合わせ",
          download: "ダウンロード",
          services: "サービス",
          tutorials: "チュートリアル",
          about: "概要",
          bizEmail: "ビジネス：",
          techEmail: "技術：",
          wxOfficial: "WeChat公式",
          terms: "利用規約",
          privacy: "プライバシーポリシー",
        },
      },
      home: {
        hero: {
          title: "あなたに寄り添い成長する、万能 AI アシスタント",
          slogan: "毎日に寄り添う、あなたの本当の相棒。",
          desc: "API Key を 1 つ入れるだけ。あとは OpenAkita が実行します。",
        },
      },
      download: { hero: { title: "OpenAkita をダウンロード", desc: "Desktop / CLI / Source の 3 つの導入方法を提供します。" } },
      tutorials: { hero: { title: "チュートリアルセンター", desc: "インストール、IM 連携、LLM 設定を網羅。" } },
      setup: {
        hero: { title: "初期セットアップ", desc: "Desktop と CLI の導入手順。" },
        side: ["概要", "要件", "OpenAkita のインストール", "起動検証"],
      },
      im: {
        hero: { title: "IM チャネル設定", desc: "各プラットフォームの申請と接続手順（QQとWeChatを含む）。" },
        side: ["プラットフォーム概要", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ", "WeChat", "音声変換", "動画"],
      },
      llm: {
        meta: {
          title: "LLM エンドポイント設定チュートリアル",
          description: "OpenAkita Desktop での LLM エンドポイント追加、プロバイダー選択、フェイルオーバー、オプションのコンパイラ/音声認識エンドポイント。",
        },
        hero: { title: "LLM エンドポイント設定", desc: "OpenAkita Desktop で LLM エンドポイント、プロバイダー、複数エンドポイントを管理。" },
        side: ["概要", "エンドポイント追加", "対応プロバイダー", "複数エンドポイントとフェイルオーバー", "コンパイラエンドポイント", "音声認識エンドポイント"],
      },
      about: { hero: { title: "私たちについて", desc: "OpenAkita のビジョンとコミュニティ。" } },
      services: { hero: { title: "製品とサービス", desc: "オープンソースの汎用アシスタントからエンタープライズ向けカスタムソリューションまで。" } },
      terms: { hero: { title: "利用規約", desc: "最終更新日：2026年3月11日" } },
      privacy: { hero: { title: "プライバシーポリシー", desc: "最終更新日：2026年3月11日" } },
    },
    ko: {
      common: {
        navToggle: "탐색 열기",
        language: "언어",
        nav: { home: "홈", download: "다운로드", services: "서비스", scenarios: "활용 사례", tutorials: "튜토리얼", about: "소개", github: "GitHub" },
        footerTagline: "Self-Evolving AI Agent: 스스로 학습하고, 절대 포기하지 않습니다.",
        footer: {
          quickLinks: "바로가기",
          followUs: "팔로우",
          contactUs: "연락처",
          download: "다운로드",
          services: "서비스",
          tutorials: "튜토리얼",
          about: "소개",
          bizEmail: "비즈니스: ",
          techEmail: "기술: ",
          wxOfficial: "WeChat 공식",
          terms: "서비스 약관",
          privacy: "개인정보 처리방침",
        },
      },
      home: {
        hero: {
          title: "함께 성장하는 올인원 AI 어시스턴트",
          slogan: "매일 곁에서 함께하는 진짜 전능한 도우미.",
          desc: "API Key 하나면 시작됩니다. 나머지는 OpenAkita가 처리합니다.",
        },
      },
      download: { hero: { title: "OpenAkita 다운로드", desc: "Desktop / CLI / Source 3가지 설치 경로를 지원합니다." } },
      tutorials: { hero: { title: "튜토리얼 센터", desc: "설치, IM 연동, LLM 설정을 다룹니다." } },
      setup: {
        hero: { title: "초기 설정", desc: "Desktop 및 CLI 설치 가이드." },
        side: ["개요", "요구 사항", "OpenAkita 설치", "시작 검증"],
      },
      im: {
        hero: { title: "IM 채널 설정", desc: "플랫폼 신청 및 연동 절차(QQ와 WeChat 포함)." },
        side: ["플랫폼 개요", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ", "WeChat", "음성 전사", "영상"],
      },
      llm: {
        meta: {
          title: "LLM 엔드포인트 설정 가이드",
          description:
            "OpenAkita Desktop에서 LLM 엔드포인트 추가, 공급자 선택, 페일오버, 선택적 컴파일러·음성 인식 엔드포인트.",
        },
        hero: { title: "LLM 엔드포인트 설정", desc: "OpenAkita Desktop에서 LLM 엔드포인트, 공급자, 다중 엔드포인트를 관리합니다." },
        side: ["개요", "엔드포인트 추가", "지원 공급자", "다중 엔드포인트 및 페일오버", "컴파일러 엔드포인트", "음성 인식 엔드포인트"],
      },
      about: { hero: { title: "소개", desc: "OpenAkita 비전과 커뮤니티." } },
      services: { hero: { title: "제품 및 서비스", desc: "오픈 소스 범용 어시스턴트부터 기업용 맞춤 솔루션까지." } },
      terms: { hero: { title: "서비스 약관", desc: "최종 업데이트: 2026년 3월 11일" } },
      privacy: { hero: { title: "개인정보 처리방침", desc: "최종 업데이트: 2026년 3월 11일" } },
    },
    ru: {
      common: {
        navToggle: "Открыть навигацию",
        language: "Язык",
        nav: { home: "Главная", download: "Скачать", services: "Услуги", scenarios: "Сценарии", tutorials: "Руководства", about: "О проекте", github: "GitHub" },
        footerTagline: "Self-Evolving AI Agent: Учится, адаптируется, никогда не сдаётся.",
        footer: {
          quickLinks: "Быстрые ссылки",
          followUs: "Подписаться",
          contactUs: "Контакты",
          download: "Скачать",
          services: "Услуги",
          tutorials: "Руководства",
          about: "О проекте",
          bizEmail: "Бизнес: ",
          techEmail: "Техподдержка: ",
          wxOfficial: "WeChat Official",
          terms: "Условия использования",
          privacy: "Политика конфиденциальности",
        },
      },
      home: {
        hero: {
          title: "Универсальный AI-помощник, который растет вместе с вами",
          slogan: "Каждый день рядом с вами — как надежный компаньон.",
          desc: "Нужен только API Key. Остальное OpenAkita сделает сам.",
        },
      },
      download: { hero: { title: "Скачать OpenAkita", desc: "Доступны Desktop, CLI и исходная установка." } },
      tutorials: { hero: { title: "Центр руководств", desc: "Установка, IM-каналы и настройка LLM." } },
      setup: {
        hero: { title: "Начальная установка", desc: "Пошаговый гайд для Desktop и CLI." },
        side: ["Обзор", "Требования", "Установка OpenAkita", "Проверка запуска"],
      },
      im: {
        hero: { title: "Настройка IM-каналов", desc: "Подключение платформ и конфигурация (включая QQ и WeChat)." },
        side: ["Обзор платформ", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ", "WeChat", "Голос", "Видео"],
      },
      llm: {
        meta: {
          title: "Руководство по настройке LLM-эндпоинтов",
          description:
            "Добавление LLM-эндпоинтов в OpenAkita Desktop, провайдеры, отказоустойчивость, опциональные компилятор и распознавание речи.",
        },
        hero: {
          title: "Настройка LLM-эндпоинтов",
          desc: "Управляйте LLM-эндпоинтами, провайдерами и несколькими эндпоинтами в OpenAkita Desktop.",
        },
        side: [
          "Обзор",
          "Добавление эндпоинта",
          "Поддерживаемые провайдеры",
          "Несколько эндпоинтов и Failover",
          "Эндпоинт компилятора",
          "Распознавание речи",
        ],
      },
      about: { hero: { title: "О нас", desc: "Видение OpenAkita и сообщество." } },
      services: { hero: { title: "Продукты и услуги", desc: "От универсального помощника до корпоративных решений." } },
      terms: { hero: { title: "Условия использования", desc: "Последнее обновление: 11 марта 2026 г." } },
      privacy: { hero: { title: "Политика конфиденциальности", desc: "Последнее обновление: 11 марта 2026 г." } },
    },
    fr: {
      common: {
        navToggle: "Ouvrir la navigation",
        language: "Langue",
        nav: { home: "Accueil", download: "Télécharger", services: "Services", scenarios: "Cas d'usage", tutorials: "Tutoriels", about: "À propos", github: "GitHub" },
        footerTagline: "Self-Evolving AI Agent : Apprendre, s'adapter, ne jamais abandonner.",
        footer: {
          quickLinks: "Liens rapides",
          followUs: "Suivez-nous",
          contactUs: "Contact",
          download: "Télécharger",
          services: "Services",
          tutorials: "Tutoriels",
          about: "À propos",
          bizEmail: "Commercial : ",
          techEmail: "Technique : ",
          wxOfficial: "WeChat officiel",
          terms: "Conditions d'utilisation",
          privacy: "Politique de confidentialité",
        },
      },
      home: {
        hero: {
          title: "Un assistant IA tout-en-un qui grandit avec vous",
          slogan: "Un compagnon au quotidien, un assistant vraiment complet.",
          desc: "Ajoutez une clé API. OpenAkita gère le reste.",
        },
      },
      download: { hero: { title: "Télécharger OpenAkita", desc: "Installation Desktop, CLI et source." } },
      tutorials: { hero: { title: "Centre de tutoriels", desc: "Installation, canaux IM et configuration LLM." } },
      setup: {
        hero: { title: "Installation initiale", desc: "Guide Desktop et CLI étape par étape." },
        side: ["Aperçu", "Prérequis", "Installer OpenAkita", "Vérification du démarrage"],
      },
      im: {
        hero: { title: "Configuration des canaux IM", desc: "Onboarding des plateformes et intégration (QQ et WeChat inclus)." },
        side: ["Aperçu plateforme", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ", "WeChat", "Voix", "Vidéo"],
      },
      llm: {
        meta: {
          title: "Guide de configuration des endpoints LLM",
          description:
            "Ajout d’endpoints LLM dans OpenAkita Desktop, fournisseurs, basculement, endpoints optionnels compilateur et reconnaissance vocale.",
        },
        hero: {
          title: "Configuration des endpoints LLM",
          desc: "Gérez les points de terminaison LLM, les fournisseurs et les endpoints multiples dans OpenAkita Desktop.",
        },
        side: [
          "Vue d’ensemble",
          "Ajouter un endpoint",
          "Fournisseurs pris en charge",
          "Multi-endpoints et basculement",
          "Endpoint compilateur",
          "Reconnaissance vocale",
        ],
      },
      about: { hero: { title: "À propos", desc: "Vision OpenAkita et communauté." } },
      services: { hero: { title: "Produits et services", desc: "De l'assistant open source aux solutions d'entreprise sur mesure." } },
      terms: { hero: { title: "Conditions d'utilisation", desc: "Dernière mise à jour : 11 mars 2026" } },
      privacy: { hero: { title: "Politique de confidentialité", desc: "Dernière mise à jour : 11 mars 2026" } },
    },
    de: {
      common: {
        navToggle: "Navigation öffnen",
        language: "Sprache",
        nav: { home: "Start", download: "Download", services: "Dienste", scenarios: "Anwendungen", tutorials: "Tutorials", about: "Über uns", github: "GitHub" },
        footerTagline: "Self-Evolving AI Agent: Lernen, anpassen, nie aufgeben.",
        footer: {
          quickLinks: "Schnellzugriff",
          followUs: "Folgen",
          contactUs: "Kontakt",
          download: "Download",
          services: "Dienste",
          tutorials: "Tutorials",
          about: "Über uns",
          bizEmail: "Geschäftlich: ",
          techEmail: "Technik: ",
          wxOfficial: "WeChat offiziell",
          terms: "Nutzungsbedingungen",
          privacy: "Datenschutzrichtlinie",
        },
      },
      home: {
        hero: {
          title: "Ein Allround-AI-Assistent, der mit dir mitwächst",
          slogan: "Dein täglicher Begleiter und wirklich vielseitiger Assistent.",
          desc: "Ein API Key reicht. Den Rest erledigt OpenAkita.",
        },
      },
      download: { hero: { title: "OpenAkita herunterladen", desc: "Desktop-, CLI- und Source-Installation verfügbar." } },
      tutorials: { hero: { title: "Tutorial-Zentrum", desc: "Installation, IM-Kanäle und LLM-Konfiguration." } },
      setup: {
        hero: { title: "Ersteinrichtung", desc: "Schritt-für-Schritt für Desktop und CLI." },
        side: ["Überblick", "Voraussetzungen", "OpenAkita installieren", "Startprüfung"],
      },
      im: {
        hero: { title: "IM-Kanal-Konfiguration", desc: "Plattform-Onboarding und Integration (inkl. QQ und WeChat)." },
        side: ["Plattformüberblick", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ", "WeChat", "Sprache", "Video"],
      },
      llm: {
        meta: {
          title: "LLM-Endpunkt-Konfiguration",
          description:
            "LLM-Endpunkte in OpenAkita Desktop hinzufügen, Anbieter wählen, Failover sowie optionale Compiler- und Spracherkennungs-Endpunkte.",
        },
        hero: {
          title: "LLM-Endpunkt-Konfiguration",
          desc: "Verwalten Sie LLM-Endpunkte, Anbieter und mehrere Endpunkte in OpenAkita Desktop.",
        },
        side: [
          "Überblick",
          "Endpunkt hinzufügen",
          "Unterstützte Anbieter",
          "Mehrere Endpunkte und Failover",
          "Compiler-Endpunkt",
          "Spracherkennung",
        ],
      },
      about: { hero: { title: "Über uns", desc: "Vision und Community von OpenAkita." } },
      services: { hero: { title: "Produkte und Dienste", desc: "Vom Open-Source-Universalassistenten bis zur maßgeschneiderten Unternehmenslösung." } },
      terms: { hero: { title: "Nutzungsbedingungen", desc: "Letzte Aktualisierung: 11. März 2026" } },
      privacy: { hero: { title: "Datenschutzrichtlinie", desc: "Letzte Aktualisierung: 11. März 2026" } },
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
    if (path === "/services" || path.startsWith("/services/")) return "services";
    if (path === "/terms" || path.startsWith("/terms/")) return "terms";
    if (path === "/privacy" || path.startsWith("/privacy/")) return "privacy";
    if (path === "/about" || path.startsWith("/about/")) return "about";
    return "home";
  }

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el && typeof value === "string") {
      el.textContent = value;
      el.dataset.i18nManaged = "";
    }
  }

  function setHtml(selector, value) {
    const el = document.querySelector(selector);
    if (el && typeof value === "string") {
      el.innerHTML = value;
      el.dataset.i18nManaged = "";
    }
  }

  function setAttr(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el && typeof value === "string") el.setAttribute(attr, value);
  }

  function setInlineLabel(selector, value) {
    const el = document.querySelector(selector);
    if (!el || typeof value !== "string") return;
    el.dataset.i18nManaged = "";
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
      if (nodes[index] && typeof value === "string") {
        nodes[index].textContent = value;
        nodes[index].dataset.i18nManaged = "";
      }
    });
  }

  function tArray(key) {
    const value = t(key);
    return Array.isArray(value) ? value : [];
  }

  var languagePacks = {};
  var loadingPacks = {};
  var originalTextMap = new WeakMap();

  function loadLanguagePack(lang) {
    if (lang === "zh") return Promise.resolve(null);
    if (languagePacks[lang]) return Promise.resolve(languagePacks[lang]);
    if (loadingPacks[lang]) return loadingPacks[lang];

    var promise = fetch("/assets/i18n/" + lang + ".json?v=20260424-i18n-fragment-fix")
      .then(function (response) {
        if (!response.ok) throw new Error("i18n_load_failed");
        return response.json();
      })
      .then(function (data) {
        languagePacks[lang] = data;
        delete loadingPacks[lang];
        return data;
      })
      .catch(function () {
        delete loadingPacks[lang];
        return null;
      });

    loadingPacks[lang] = promise;
    return promise;
  }

  function collapseWhitespaceForI18nLookup(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  var codeSampleOriginalTextMap = new WeakMap();

  function lookupLanguagePackString(zhText, pack) {
    if (!pack) return null;
    if (pack[zhText]) return pack[zhText];
    var collapsed = collapseWhitespaceForI18nLookup(zhText);
    if (collapsed && pack[collapsed]) return pack[collapsed];
    return null;
  }

  function translatePackString(zhText) {
    if (currentLanguage === "zh") return zhText;
    var pack = languagePacks[currentLanguage];
    if (!pack) return zhText;
    var translated = lookupLanguagePackString(zhText, pack);
    return translated && translated.trim() ? translated : zhText;
  }

  function applyCodeSampleTranslations() {
    var pack = currentLanguage !== "zh" ? languagePacks[currentLanguage] : null;
    document.querySelectorAll("code[data-i18n-translate]").forEach(function (code) {
      if (!codeSampleOriginalTextMap.has(code)) {
        codeSampleOriginalTextMap.set(code, code.textContent);
      }
      var zh = codeSampleOriginalTextMap.get(code);
      if (currentLanguage === "zh") {
        code.textContent = zh;
        return;
      }
      if (!CONTENT_TRANSLATE_LANGS.has(currentLanguage) || !pack) {
        code.textContent = zh;
        return;
      }
      var translated = lookupLanguagePackString(zh, pack);
      code.textContent = translated && translated.trim() ? translated : zh;
    });
  }

  function applyContentTranslations() {
    var pack = currentLanguage !== "zh" ? languagePacks[currentLanguage] : null;

    var roots = [];
    var mainEl = document.querySelector("main");
    var footerEl = document.querySelector(".site-footer");
    var drawerEl = document.querySelector("[data-setup-drawer]");
    var sceneNavEl = document.querySelector(".scene-nav");
    if (mainEl) roots.push(mainEl);
    if (footerEl) roots.push(footerEl);
    if (drawerEl) roots.push(drawerEl);
    if (sceneNavEl) roots.push(sceneNavEl);

    var meaningfulPattern = /[\p{L}\p{N}]/u;

    roots.forEach(function (root) {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var node = walker.nextNode();

      while (node) {
        var parent = node.parentElement;
        if (!parent) { node = walker.nextNode(); continue; }

        if (parent.closest("script,style,noscript,textarea,code,pre,.code-block,[data-i18n-managed]")) {
          node = walker.nextNode();
          continue;
        }

        var idCarrier = parent.closest("[id]");
        if (idCarrier && CONTENT_SKIP_IDS.has(idCarrier.id)) {
          node = walker.nextNode();
          continue;
        }

        var raw = node.nodeValue || "";
        var match = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
        if (!match) { node = walker.nextNode(); continue; }

        var prefix = match[1];
        var core = match[2];
        var suffix = match[3];

        if (!core || !meaningfulPattern.test(core) || core.trim().startsWith("\u00a9")) {
          node = walker.nextNode();
          continue;
        }

        var source = originalTextMap.get(node);
        if (!source) {
          source = core;
          originalTextMap.set(node, source);
        }

        var translated = pack ? lookupLanguagePackString(source, pack) : null;
        if (translated && translated.trim()) {
          node.nodeValue = prefix + translated + suffix;
        } else {
          node.nodeValue = prefix + source + suffix;
        }

        node = walker.nextNode();
      }
    });
  }

  // ── Image i18n ──
  var originalImgSrcMap = new WeakMap();

  function applyImageTranslations() {
    var imgs = document.querySelectorAll("[data-i18n-img]");
    imgs.forEach(function (img) {
      if (!originalImgSrcMap.has(img)) {
        originalImgSrcMap.set(img, img.getAttribute("src"));
      }
      var zhSrc = originalImgSrcMap.get(img);

      if (currentLanguage === "zh") {
        img.setAttribute("src", zhSrc);
        return;
      }

      var langSrc = zhSrc.replace("/zh/", "/" + currentLanguage + "/");
      var enSrc = zhSrc.replace("/zh/", "/en/");

      var candidates = [langSrc];
      if (currentLanguage !== "en") {
        candidates.push(enSrc);
      }

      function tryNext(i) {
        if (i >= candidates.length) {
          img.setAttribute("src", zhSrc);
          return;
        }
        var probe = new Image();
        probe.onload = function () {
          window.setTimeout(function () {
            if (probe.naturalWidth > 0 || probe.naturalHeight > 0) {
              img.setAttribute("src", candidates[i]);
            } else {
              tryNext(i + 1);
            }
          }, 0);
        };
        probe.onerror = function () {
          tryNext(i + 1);
        };
        probe.src = candidates[i];
      }

      tryNext(0);
    });
  }

  function initLocalizedVideos() {
    const blocks = document.querySelectorAll("[data-video-block]");
    if (!blocks.length) return;

    const isChinese = currentLanguage === "zh";
    blocks.forEach(function (block) {
      const frame = block.querySelector("iframe[data-video-frame]");
      if (!frame) return;

      const zhSrc = (block.getAttribute("data-video-zh") || "").trim();
      const enSrc = (block.getAttribute("data-video-en") || "").trim();
      const targetSrc = isChinese ? zhSrc : enSrc;
      const item = block.closest("[data-video-item]") || block.closest(".video-item") || block.closest(".video-block");

      if (!targetSrc) {
        block.hidden = true;
        if (item) item.hidden = true;
        return;
      }

      if (frame.getAttribute("src") !== targetSrc) {
        frame.setAttribute("src", targetSrc);
      }
      block.hidden = false;
      if (item) item.hidden = false;
    });

    document.querySelectorAll("[data-video-scope]").forEach(function (scope) {
      const hasVisibleVideo = !!scope.querySelector("[data-video-block]:not([hidden])");
      scope.hidden = !hasVisibleVideo;
      scope.querySelectorAll("[data-video-heading]").forEach(function (heading) {
        heading.hidden = !hasVisibleVideo;
      });
    });
  }

  let homeHeroTypingRun = 0;

  function applyHomeRevealStagger() {
    const revealNodes = document.querySelectorAll(".home-section .reveal");
    revealNodes.forEach(function (node, index) {
      const delay = Math.min(index * 65, 520);
      node.style.setProperty("--reveal-delay", delay + "ms");
    });
  }

  function getHomeHeroSubtitle(rawTitle, fallback) {
    const raw = (rawTitle || "").trim();
    if (!raw) return (fallback || "").trim();
    const stripped = raw.replace(/^openakita[\s,，:：-]*/i, "").trim();
    return stripped || raw;
  }

  function normalizeHomeHeroSubtitleLayout() {
    const subline = document.querySelector("body[data-page='home'] .hero-title-subline");
    const typed = document.getElementById("heroTypedTitle");
    if (!subline || !typed) return;

    const wraps = subline.querySelectorAll(".hero-typed-wrap");
    wraps.forEach(function (wrap) {
      const parent = wrap.parentElement;
      if (!parent) return;
      while (wrap.firstChild) {
        parent.insertBefore(wrap.firstChild, wrap);
      }
      wrap.remove();
    });

    typed.style.fontSize = "";
    typed.style.transform = "";
  }

  function startHomeHeroTyping() {
    const target = document.getElementById("heroTypedTitle");
    if (!target) return;

    normalizeHomeHeroSubtitleLayout();
    const text = getHomeHeroSubtitle(t("home.hero.title"), target.getAttribute("data-typed-title"));
    target.setAttribute("data-typed-title", text);

    const reducedMotion =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    homeHeroTypingRun += 1;
    const runId = homeHeroTypingRun;
    target.textContent = "";

    if (!text || reducedMotion) {
      target.textContent = text;
      return;
    }

    let cursor = 0;

    function typeNext() {
      if (runId !== homeHeroTypingRun) return;
      cursor += 1;
      target.textContent = text.slice(0, cursor);
      if (cursor >= text.length) return;

      const typedChar = text.charAt(cursor - 1);
      const delay = /[\s·,.;:!?，。！？：；、]/.test(typedChar) ? 180 : 95;
      window.setTimeout(typeNext, delay);
    }

    window.setTimeout(typeNext, 360);
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
    setText('.main-nav a[data-nav="services"]', t("common.nav.services"));
    setText('.main-nav a[data-nav="scenarios"]', t("common.nav.scenarios"));
    setText('.main-nav a[data-nav="tutorials"]', t("common.nav.tutorials"));
    setText('.main-nav a[data-nav="about"]', t("common.nav.about"));
    const githubLink = document.querySelector('.main-nav a[href*="github.com/openakita/openakita"]');
    if (githubLink) {
      githubLink.textContent = t("common.nav.github");
      githubLink.dataset.i18nManaged = "";
    }
    setText(".lang-label", t("common.language"));
    setText(".footer-tagline", t("common.footerTagline"));

    applyFooterTexts();
  }

  function applyFooterTexts() {
    const isStandardFooter = !!document.querySelector(".footer-tagline");

    if (isStandardFooter) {
      setText(".footer-grid > div:nth-child(2) > h4", t("common.footer.quickLinks"));
      setText('.footer-grid a[href="/download/"]', t("common.footer.download"));
      setText('.footer-grid a[href="/services/"]', t("common.footer.services"));
      setText('.footer-grid a[href="/tutorials/"]', t("common.footer.tutorials"));
      setText('.footer-grid a[href="/about/"]', t("common.footer.about"));
      setText('.site-footer a[href="/terms/"]', t("common.footer.terms"));
      setText('.site-footer a[href="/privacy/"]', t("common.footer.privacy"));
    }

    const footerCols = document.querySelectorAll(".footer-grid > div");
    footerCols.forEach(function (col) {
      const h4 = col.querySelector("h4");
      if (!h4) return;
      if (col.querySelector(".footer-qr-list")) {
        h4.textContent = t("common.footer.followUs");
        h4.dataset.i18nManaged = "";
      } else if (col.querySelector('a[href^="mailto:"]')) {
        h4.textContent = t("common.footer.contactUs");
        h4.dataset.i18nManaged = "";
      }
    });

    const qrSpans = document.querySelectorAll(".footer-qr span");
    if (qrSpans[0]) { qrSpans[0].textContent = t("common.footer.wxOfficial"); qrSpans[0].dataset.i18nManaged = ""; }
    if (qrSpans[1]) { qrSpans[1].textContent = "Bilibili"; qrSpans[1].dataset.i18nManaged = ""; }

    setFooterContactLabel("openakita@fzstack.com", t("common.footer.bizEmail"));
    setFooterContactLabel("simyng@fzstack.com", t("common.footer.techEmail"));
  }

  function setFooterContactLabel(email, label) {
    const link = document.querySelector('.site-footer a[href="mailto:' + email + '"]');
    if (!link) return;
    const textNodes = [];
    for (let i = 0; i < link.childNodes.length; i++) {
      if (link.childNodes[i].nodeType === 3) textNodes.push(link.childNodes[i]);
    }
    if (textNodes.length > 0) {
      textNodes[textNodes.length - 1].nodeValue = label + email;
    }
    link.dataset.i18nManaged = "";
  }

  function applyHomeTexts() {
    setText("#heroTypedTitle", getHomeHeroSubtitle(t("home.hero.title"), "让私人AI随时陪伴"));
    setText("#heroSloganText", t("home.hero.slogan"));
    setText(".hero .hero-lead", t("home.hero.desc"));
    setInlineLabel("#downloadDesktopButton", t("home.hero.btnDownload"));
    setInlineLabel('.hero .hero-actions a[href="/tutorials/setup-install/"]', t("home.hero.btnSetup"));
    setInlineLabel('.hero .hero-actions a[href="/tutorials/"]', t("home.hero.btnTutorials"));
    startHomeHeroTyping();
  }

  function applyDownloadTexts() {
    setText(".page-hero h1", t("download.hero.title"));
    setText(".page-hero p", t("download.hero.desc"));
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

  function applyServicesTexts() {
    setText(".page-hero h1", t("services.hero.title"));
    setText(".page-hero p", t("services.hero.desc"));
  }

  function applyTermsTexts() {
    setText(".page-hero h1", t("terms.hero.title"));
    setText(".page-hero p", t("terms.hero.desc"));
  }

  function applyPrivacyTexts() {
    setText(".page-hero h1", t("privacy.hero.title"));
    setText(".page-hero p", t("privacy.hero.desc"));
  }

  function applyPageTexts(pageKey) {
    if (pageKey === "home") applyHomeTexts();
    if (pageKey === "download") applyDownloadTexts();
    if (pageKey === "tutorials") applyTutorialIndexTexts();
    if (pageKey === "setup") applySetupTexts();
    if (pageKey === "im") applyImTexts();
    if (pageKey === "llm") applyLlmTexts();
    if (pageKey === "about") applyAboutTexts();
    if (pageKey === "services") applyServicesTexts();
    if (pageKey === "terms") applyTermsTexts();
    if (pageKey === "privacy") applyPrivacyTexts();
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
      var targetLang = normalizeLanguageTag(select.value);
      currentLanguage = targetLang;
      localStorage.setItem("openakita_language", currentLanguage);
      document.documentElement.lang = LANG_TO_LOCALE[currentLanguage] || "en-US";

      applyMeta(pageKey);
      applyCommonTexts();
      applyPageTexts(pageKey);
      initLocalizedVideos();
      applyHomeRevealStagger();
      enhanceCodeBlocks();

      applyImageTranslations();

      if (currentLanguage === "zh" || languagePacks[currentLanguage]) {
        applyContentTranslations();
        applyCodeSampleTranslations();
        document.dispatchEvent(new CustomEvent("openakita:language-changed"));
      } else {
        loadLanguagePack(currentLanguage).then(function () {
          if (currentLanguage !== targetLang) return;
          applyContentTranslations();
          applyCodeSampleTranslations();
          enhanceCodeBlocks();
          document.dispatchEvent(new CustomEvent("openakita:language-changed"));
        });
      }
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
  applyMeta(pageKey);
  applyCommonTexts();
  applyPageTexts(pageKey);
  initLocalizedVideos();
  applyHomeRevealStagger();
  injectLanguageSwitcher(pageKey);
  enhanceCodeBlocks();
  initSetupInstallDrawer();
  initSceneNav();

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

  if (currentLanguage !== "zh" && CONTENT_TRANSLATE_LANGS.has(currentLanguage)) {
    loadLanguagePack(currentLanguage).then(function () {
      applyContentTranslations();
      applyCodeSampleTranslations();
      enhanceCodeBlocks();
    });
  }

  if (currentLanguage !== "zh") {
    applyImageTranslations();
  }

  setTimeout(function () {
    SUPPORTED_LANGS.forEach(function (lang) {
      if (lang !== "zh" && lang !== currentLanguage && !languagePacks[lang] && !loadingPacks[lang]) {
        loadLanguagePack(lang);
      }
    });
  }, 2500);

  function initSetupInstallDrawer() {
    const triggers = Array.from(document.querySelectorAll("[data-setup-method]"));
    const drawer = document.querySelector("[data-setup-drawer]");
    const backdrop = document.querySelector("[data-setup-drawer-backdrop]");
    const closeBtn = document.querySelector("[data-setup-drawer-close]");
    const titleNode = document.querySelector("[data-setup-drawer-title]");
    const navNode = document.querySelector("[data-setup-drawer-nav]");
    const contentNode = document.querySelector("[data-setup-drawer-content]");
    let activeMethod = null;

    if (!triggers.length || !drawer || !backdrop || !closeBtn || !titleNode || !navNode || !contentNode) return;

    const methodMap = {
      desktop: {
        title: "方式一：Desktop（配置向导）",
        templateId: "setup-drawer-template-desktop",
        chapters: [
          { id: "drawer-desktop-prereq",        label: "前置条件" },
          { id: "drawer-desktop-download",      label: "1. 下载安装包" },
          { id: "drawer-desktop-install-steps", label: "2. 正式安装" },
          { id: "drawer-desktop-wizard",        label: "3. 配置向导（初次配置）" },
          { id: "drawer-desktop-full-overview", label: "4. 完整配置" },
          { id: "drawer-desktop-full-llm",      label: "4.1 LLM 端点配置" },
          { id: "drawer-desktop-full-im",       label: "4.2 IM 通道" },
          { id: "drawer-desktop-full-tools",    label: "4.3 工具与技能" },
          { id: "drawer-desktop-full-soul",     label: "4.4 灵魂与意志" },
          { id: "drawer-desktop-full-advanced", label: "4.5 高级配置" },
          { id: "drawer-desktop-full-multi",    label: "4.6 多 Agent 模式" },
          { id: "drawer-desktop-full-done",     label: "4.7 完成" },
        ],
      },
      pypi: {
        title: "方式二：PyPI CLI",
        templateId: "setup-drawer-template-pypi",
        chapters: [
          { id: "drawer-pypi-prereq", label: "一、环境要求" },
          { id: "drawer-pypi-install", label: "二、安装步骤" },
          { id: "drawer-pypi-first-run", label: "三、首次运行" },
          { id: "drawer-pypi-verify", label: "四、日常使用" },
          { id: "drawer-pypi-script", label: "五、可选：官方一键脚本" },
          { id: "drawer-pypi-faq", label: "六、常见问题" },
          { id: "drawer-pypi-cheatsheet", label: "七、完整命令速查" },
        ],
      },
      source: {
        title: "方式三：源码安装",
        templateId: "setup-drawer-template-source",
        chapters: [
          { id: "drawer-source-install", label: "1. 安装步骤" },
          { id: "drawer-source-check", label: "2. 必查项" },
          { id: "drawer-source-verify", label: "3. 启动验证" },
        ],
      },
    };

    function closeDrawer() {
      drawer.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      backdrop.setAttribute("aria-hidden", "true");
      document.body.classList.remove("setup-drawer-open");
    }

    function openDrawer(method) {
      const config = methodMap[method];
      if (!config) return;
      const template = document.getElementById(config.templateId);
      if (!template) return;
      activeMethod = method;

      titleNode.textContent = translatePackString(config.title);
      navNode.innerHTML = "";
      contentNode.innerHTML = "";
      contentNode.appendChild(template.content.cloneNode(true));

      config.chapters.forEach(function (chapter) {
        const link = document.createElement("a");
        link.href = "#" + chapter.id;
        link.textContent = translatePackString(chapter.label);
        const match = chapter.label.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
        if (match) {
          if (match[3] !== undefined) link.classList.add("setup-nav-l3");
          else if (match[2] !== undefined) link.classList.add("setup-nav-l2");
          else link.classList.add("setup-nav-l1");
        } else {
          link.classList.add("setup-nav-l1");
        }
        link.addEventListener("click", function (event) {
          event.preventDefault();
          const target = contentNode.querySelector("#" + chapter.id);
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
        navNode.appendChild(link);
      });

      applyContentTranslations();
      applyCodeSampleTranslations();
      enhanceCodeBlocks();
      applyImageTranslations();
      drawer.classList.add("is-open");
      backdrop.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      backdrop.setAttribute("aria-hidden", "false");
      document.body.classList.add("setup-drawer-open");
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        openDrawer(trigger.getAttribute("data-setup-method"));
      });
    });

    closeBtn.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && drawer.classList.contains("is-open")) {
        closeDrawer();
      }
    });

    document.addEventListener("openakita:language-changed", function () {
      if (!drawer.classList.contains("is-open") || !activeMethod) return;
      openDrawer(activeMethod);
    });
  }

  // ── GitHub Stars ──
  (function () {
    var REPO = "openakita/openakita";
    var CACHE_KEY = "oa_gh_stars";
    var CACHE_TTL = 3600000; // 1 hour

    function formatCount(n) {
      if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
      return String(n);
    }

    function applyStars(count) {
      var formatted = formatCount(count);
      document.querySelectorAll("[data-gh-stars]").forEach(function (el) {
        el.textContent = "\u2605 " + formatted;
      });
      var heroLink = document.querySelector(".gh-hero-link");
      if (heroLink) heroLink.classList.add("is-visible");
    }

    var lastStarCount = null;

    function injectNavBadge(count) {
      var navGH = document.querySelector('.main-nav a[href*="github.com"]');
      if (!navGH) return;
      var existing = navGH.querySelector(".nav-star-badge");
      if (existing) return;
      var badge = document.createElement("span");
      badge.className = "nav-star-badge";
      badge.textContent = formatCount(count);
      navGH.classList.add("has-stars");
      navGH.appendChild(badge);
    }

    document.addEventListener("openakita:language-changed", function () {
      if (lastStarCount !== null) injectNavBadge(lastStarCount);
    });

    try {
      var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      if (cached.count && cached.ts && Date.now() - cached.ts < CACHE_TTL) {
        lastStarCount = cached.count;
        applyStars(cached.count);
        injectNavBadge(cached.count);
        return;
      }
    } catch (_) {}

    fetch("https://api.github.com/repos/" + REPO)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var count = data.stargazers_count;
        if (typeof count !== "number") return;
        lastStarCount = count;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ count: count, ts: Date.now() }));
        applyStars(count);
        injectNavBadge(count);
      })
      .catch(function () {});
  })();

  function initSceneNav() {
    var navItems = document.querySelectorAll(".scene-nav-item");
    if (!navItems.length) return;
    var sections = [];
    navItems.forEach(function (a) {
      var id = a.getAttribute("data-target");
      var sec = document.getElementById(id);
      if (sec) sections.push({ el: sec, link: a });
    });
    if (!sections.length) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var item = sections.find(function (s) { return s.el === entry.target; });
        if (item) {
          if (entry.isIntersecting) item.link.classList.add("active");
          else item.link.classList.remove("active");
        }
      });
    }, { rootMargin: "-20% 0px -60% 0px" });
    sections.forEach(function (s) { observer.observe(s.el); });
  }

})();
