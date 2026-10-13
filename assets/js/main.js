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
        navClose: "关闭导航",
        skipToContent: "跳至主要内容",
        language: "语言",
        nav: {
          home: "首页",
          download: "下载",
          marketplace: "市场",
          services: "服务",
          scenarios: "应用场景",
          tutorials: "教程",
          about: "关于我们",
          github: "GitHub",
        },
        account: {
          login: "登录/注册",
          menu: "账户菜单",
          label: "账户",
          hub: "我的 OpenAkita",
          marketplaceLibrary: "Marketplace：已获取资源",
          passConsole: "OpenAkita Pass：控制台",
          security: "登录与安全",
          entitlements: "权益与 License",
          logout: "退出登录",
          unavailable: "账户服务暂时不可用",
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
        tutorialBackToTop: "回到顶部",
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
      accountHub: {
        meta: {
          title: "我的 OpenAkita",
          description: "查看你的 OpenAkita 账户状态、Marketplace 资源摘要与统一权益摘要。",
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
          btnChat: "网页对话",
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
          title: "下载 OpenAkita - Desktop / CLI / Docker / Source",
          description: "OpenAkita 下载页面：Desktop 安装包、PyPI CLI、Docker Compose 容器部署与源码安装。",
        },
        hero: {
          title: "下载与安装 OpenAkita",
          desc: "官方支持 Desktop、CLI、Docker、源码部署四种方式。你可以从简单到深入逐步切换。",
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
            title: "CLI 安装",
            desc: "适合命令行用户与自动化部署，步骤最短。",
            btn: "查看完整安装教程",
          },
          source: {
            title: "源码安装",
            desc: "适合需要二次开发、定制构建和自托管流程的团队。",
          },
        },
      },
      tutorials: {
        meta: {
          title: "OpenAkita 教程中心",
          description:
            "OpenAkita 官方教程中心：安装 OpenAkita 与功能配置两大分类，图文与视频教程入口。",
        },
        hero: {
          title: "教程中心",
          desc: "按分类浏览安装与功能配置教程，快速找到你需要的内容。",
        },
        search: {
          placeholder: "搜索教程…",
          empty: "未找到匹配的教程",
          label: "搜索教程",
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
          back: "返回教程中心",
          eyebrow: "教程 / IM 通道",
        },
        side: ["平台概览", "Telegram", "飞书", "钉钉", "企业微信", "QQ", "微信", "语音转写", "视频教程"],
      },
      llm: {
        meta: {
          title: "大模型端点配置教程",
          description: "OpenAkita Desktop 上的大模型端点添加、服务商选择、多端点容灾与可选编译器/语音识别端点。",
        },
        hero: {
          title: "大模型端点配置",
          desc: "在桌面端中管理大模型端点、服务商与多端点。",
          back: "返回教程中心",
          eyebrow: "教程 / 大模型端点",
        },
        side: ["概述", "添加端点", "支持的服务商", "多端点与 Failover", "编译器端点", "语音识别端点"],
      },
      installDesktop: {
        hero: {
          back: "返回教程中心",
          eyebrow: "教程 / 安装 / Windows 桌面端",
        },
      },
      installPypi: {
        hero: {
          back: "返回教程中心",
          eyebrow: "教程 / 安装 / Linux",
        },
      },
      installDocker: {
        hero: {
          back: "返回教程中心",
          eyebrow: "教程 / 安装 / Docker",
        },
      },
      webSearch: {
        meta: {
          title: "网页搜索源配置教程",
          description:
            "OpenAkita 网页搜索源配置教程：博查 Bocha、Tavily、SearXNG、Jina 与 DuckDuckGo 的对比与配置步骤。",
        },
        hero: {
          title: "网页搜索源配置",
          desc: "本教程基于 OpenAkita v1.27.20。",
          back: "返回教程中心",
          eyebrow: "教程 / 网页搜索源",
        },
        side: ["搜索源对比", "博查 Bocha", "Tavily", "SearXNG", "Jina"],
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
          desc: "最后更新日期：2026 年 10 月 12 日",
        },
      },
    },
    en: {
      common: {
        navToggle: "Open navigation",
        navClose: "Close navigation",
        skipToContent: "Skip to main content",
        language: "Language",
        nav: {
          home: "Home",
          download: "Download",
          marketplace: "Marketplace",
          services: "Services",
          scenarios: "Use Cases",
          tutorials: "Tutorials",
          about: "About",
          github: "GitHub",
        },
        account: {
          login: "Sign in / Register",
          menu: "Account menu",
          label: "Account",
          hub: "My OpenAkita",
          marketplaceLibrary: "Marketplace: Acquired resources",
          passConsole: "OpenAkita Pass: Console",
          security: "Sign-in & security",
          entitlements: "Entitlements & License",
          logout: "Sign out",
          unavailable: "Account service is temporarily unavailable",
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
        tutorialBackToTop: "Back to top",
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
      accountHub: {
        meta: {
          title: "My OpenAkita",
          description: "View your OpenAkita account status, Marketplace resource summary, and entitlements.",
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
          btnChat: "Web Chat",
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
          title: "Download OpenAkita - Desktop / CLI / Docker / Source",
          description: "OpenAkita downloads: Desktop packages, PyPI CLI, Docker Compose deployment, and source installation.",
        },
        hero: {
          title: "Download and Install OpenAkita",
          desc: "Officially supports Desktop, CLI, Docker, and source deployment. Switch gradually from simple to advanced.",
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
            title: "CLI Installation",
            desc: "Best for command-line users and automated deployment—the shortest path.",
            btn: "View Full Installation Guide",
          },
          source: {
            title: "Source Installation",
            desc: "Best for custom development and self-hosted pipelines.",
          },
        },
      },
      tutorials: {
        meta: {
          title: "OpenAkita Tutorial Center",
          description:
            "Official OpenAkita tutorial center: installation and configuration categories with text and video guides.",
        },
        hero: {
          title: "Tutorial Center",
          desc: "Browse installation and configuration tutorials by category.",
        },
        search: {
          placeholder: "Search tutorials…",
          empty: "No matching tutorials found",
          label: "Search tutorials",
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
          back: "Back to Tutorial Center",
          eyebrow: "Tutorial / IM Channels",
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
          back: "Back to Tutorial Center",
          eyebrow: "Tutorials / LLM endpoints",
        },
        side: ["Overview", "Add endpoint", "Supported providers", "Multi-endpoint & Failover", "Compiler endpoint", "Speech recognition"],
      },
      installDesktop: {
        hero: {
          back: "Back to Tutorial Center",
          eyebrow: "Tutorial / Installation / Windows Desktop",
        },
      },
      installPypi: {
        hero: {
          back: "Back to Tutorial Center",
          eyebrow: "Tutorial / Installation / Linux",
        },
      },
      installDocker: {
        hero: {
          back: "Back to Tutorial Center",
          eyebrow: "Tutorial / Installation / Docker",
        },
      },
      webSearch: {
        meta: {
          title: "Web Search Source Configuration Guide",
          description:
            "Compare and configure Bocha, Tavily, SearXNG, Jina, and DuckDuckGo web search sources in OpenAkita.",
        },
        hero: {
          title: "Web Search Source Configuration",
          desc: "Based on OpenAkita v1.27.20.",
          back: "Back to Tutorial Center",
          eyebrow: "Tutorial / Web Search",
        },
        side: ["Source comparison", "Bocha", "Tavily", "SearXNG", "Jina"],
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
          desc: "Last updated: October 12, 2026",
        },
      },
    },
    ja: {
      common: {
        navToggle: "ナビを開く",
        navClose: "ナビを閉じる",
        skipToContent: "メインコンテンツへ移動",
        language: "言語",
        nav: { home: "ホーム", download: "ダウンロード", marketplace: "Marketplace", services: "サービス", scenarios: "活用シーン", tutorials: "チュートリアル", about: "概要", github: "GitHub" },
        account: { login: "ログイン / 登録", menu: "アカウントメニュー", label: "アカウント", hub: "マイ OpenAkita", marketplaceLibrary: "Marketplace：取得済みリソース", passConsole: "OpenAkita Pass：コンソール", security: "ログインとセキュリティ", entitlements: "権利と License", logout: "ログアウト", unavailable: "アカウントサービスを利用できません" },
        footerTagline: "Self-Evolving AI Agent：自ら学び、決して諦めない。",
        tutorialBackToTop: "ページトップへ",
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
          btnChat: "ウェブチャット",
        },
      },
      download: { hero: { title: "OpenAkita をダウンロード", desc: "Desktop / CLI / Docker / ソースコードの 4 つの導入方法を提供します。" } },
      tutorials: {
        hero: { title: "チュートリアルセンター", desc: "カテゴリ別にインストールと機能設定のチュートリアルを閲覧。" },
        search: {
          placeholder: "チュートリアルを検索…",
          empty: "一致するチュートリアルが見つかりません",
          label: "チュートリアルを検索",
        },
      },
      setup: {
        hero: { title: "初期セットアップ", desc: "Desktop と CLI の導入手順。" },
        side: ["概要", "要件", "OpenAkita のインストール", "起動検証"],
      },
      im: {
        hero: {
          title: "IM チャネル設定",
          desc: "各プラットフォームの申請と接続手順（QQとWeChatを含む）。",
          back: "チュートリアルセンターに戻る",
          eyebrow: "チュートリアル / IM チャネル",
        },
        side: ["プラットフォーム概要", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ", "WeChat", "音声変換", "動画"],
      },
      llm: {
        meta: {
          title: "LLM エンドポイント設定チュートリアル",
          description: "OpenAkita Desktop での LLM エンドポイント追加、プロバイダー選択、フェイルオーバー、オプションのコンパイラ/音声認識エンドポイント。",
        },
        hero: {
          title: "LLM エンドポイント設定",
          desc: "OpenAkita Desktop で LLM エンドポイント、プロバイダー、複数エンドポイントを管理。",
          back: "チュートリアルセンターに戻る",
          eyebrow: "チュートリアル / LLM エンドポイント",
        },
        side: ["概要", "エンドポイント追加", "対応プロバイダー", "複数エンドポイントとフェイルオーバー", "コンパイラエンドポイント", "音声認識エンドポイント"],
      },
      installDesktop: {
        hero: { back: "チュートリアルセンターに戻る", eyebrow: "チュートリアル / インストール / Windows デスクトップ" },
      },
      installPypi: {
        hero: { back: "チュートリアルセンターに戻る", eyebrow: "チュートリアル / インストール / Linux" },
      },
      installDocker: {
        hero: { back: "チュートリアルセンターに戻る", eyebrow: "チュートリアル / インストール / Docker" },
      },
      webSearch: {
        meta: {
          title: "Web 検索ソース設定チュートリアル",
          description: "OpenAkita で Bocha、Tavily、SearXNG、Jina、DuckDuckGo の Web 検索ソースを比較・設定する手順。",
        },
        hero: {
          title: "Web 検索ソース設定",
          desc: "OpenAkita v1.27.20 ベース。",
          back: "チュートリアルセンターに戻る",
          eyebrow: "チュートリアル / Web 検索",
        },
        side: ["検索ソース比較", "Bocha", "Tavily", "SearXNG", "Jina"],
      },
      about: { hero: { title: "私たちについて", desc: "OpenAkita のビジョンとコミュニティ。" } },
      services: { hero: { title: "製品とサービス", desc: "オープンソースの汎用アシスタントからエンタープライズ向けカスタムソリューションまで。" } },
      terms: { hero: { title: "利用規約", desc: "最終更新日：2026年3月11日" } },
      privacy: { hero: { title: "プライバシーポリシー", desc: "最終更新日：2026年10月12日" } },
    },
    ko: {
      common: {
        navToggle: "탐색 열기",
        navClose: "탐색 닫기",
        skipToContent: "본문으로 건너뛰기",
        language: "언어",
        nav: { home: "홈", download: "다운로드", marketplace: "Marketplace", services: "서비스", scenarios: "활용 사례", tutorials: "튜토리얼", about: "소개", github: "GitHub" },
        account: { login: "로그인 / 가입", menu: "계정 메뉴", label: "계정", hub: "내 OpenAkita", marketplaceLibrary: "Marketplace: 획득한 리소스", passConsole: "OpenAkita Pass: 콘솔", security: "로그인 및 보안", entitlements: "권한 및 License", logout: "로그아웃", unavailable: "계정 서비스를 일시적으로 사용할 수 없습니다" },
        footerTagline: "Self-Evolving AI Agent: 스스로 학습하고, 절대 포기하지 않습니다.",
        tutorialBackToTop: "맨 위로",
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
          btnChat: "웹 채팅",
        },
      },
      download: { hero: { title: "OpenAkita 다운로드", desc: "Desktop / CLI / Docker / 소스 코드 4가지 설치 경로를 지원합니다." } },
      tutorials: {
        hero: { title: "튜토리얼 센터", desc: "카테고리별로 설치 및 기능 설정 튜토리얼을 둘러보세요." },
        search: {
          placeholder: "튜토리얼 검색…",
          empty: "일치하는 튜토리얼을 찾을 수 없습니다",
          label: "튜토리얼 검색",
        },
      },
      setup: {
        hero: { title: "초기 설정", desc: "Desktop 및 CLI 설치 가이드." },
        side: ["개요", "요구 사항", "OpenAkita 설치", "시작 검증"],
      },
      im: {
        hero: {
          title: "IM 채널 설정",
          desc: "플랫폼 신청 및 연동 절차(QQ와 WeChat 포함).",
          back: "튜토리얼 센터로 돌아가기",
          eyebrow: "튜토리얼 / IM 채널",
        },
        side: ["플랫폼 개요", "Telegram", "Feishu", "DingTalk", "WeCom", "QQ", "WeChat", "음성 전사", "영상"],
      },
      llm: {
        meta: {
          title: "LLM 엔드포인트 설정 가이드",
          description:
            "OpenAkita Desktop에서 LLM 엔드포인트 추가, 공급자 선택, 페일오버, 선택적 컴파일러·음성 인식 엔드포인트.",
        },
        hero: {
          title: "LLM 엔드포인트 설정",
          desc: "OpenAkita Desktop에서 LLM 엔드포인트, 공급자, 다중 엔드포인트를 관리합니다.",
          back: "튜토리얼 센터로 돌아가기",
          eyebrow: "튜토리얼 / LLM 엔드포인트",
        },
        side: ["개요", "엔드포인트 추가", "지원 공급자", "다중 엔드포인트 및 페일오버", "컴파일러 엔드포인트", "음성 인식 엔드포인트"],
      },
      installDesktop: {
        hero: { back: "튜토리얼 센터로 돌아가기", eyebrow: "튜토리얼 / 설치 / Windows 데스크톱" },
      },
      installPypi: {
        hero: { back: "튜토리얼 센터로 돌아가기", eyebrow: "튜토리얼 / 설치 / Linux" },
      },
      installDocker: {
        hero: { back: "튜토리얼 센터로 돌아가기", eyebrow: "튜토리얼 / 설치 / Docker" },
      },
      webSearch: {
        meta: {
          title: "웹 검색 소스 설정 가이드",
          description: "OpenAkita에서 Bocha, Tavily, SearXNG, Jina, DuckDuckGo 웹 검색 소스를 비교하고 설정하는 방법.",
        },
        hero: {
          title: "웹 검색 소스 설정",
          desc: "OpenAkita v1.27.20 기준.",
          back: "튜토리얼 센터로 돌아가기",
          eyebrow: "튜토리얼 / 웹 검색",
        },
        side: ["검색 소스 비교", "Bocha", "Tavily", "SearXNG", "Jina"],
      },
      about: { hero: { title: "소개", desc: "OpenAkita 비전과 커뮤니티." } },
      services: { hero: { title: "제품 및 서비스", desc: "오픈 소스 범용 어시스턴트부터 기업용 맞춤 솔루션까지." } },
      terms: { hero: { title: "서비스 약관", desc: "최종 업데이트: 2026년 3월 11일" } },
      privacy: { hero: { title: "개인정보 처리방침", desc: "최종 업데이트: 2026년 10월 12일" } },
    },
    ru: {
      common: {
        navToggle: "Открыть навигацию",
        navClose: "Закрыть навигацию",
        skipToContent: "Перейти к основному содержанию",
        language: "Язык",
        nav: { home: "Главная", download: "Скачать", marketplace: "Marketplace", services: "Услуги", scenarios: "Сценарии", tutorials: "Руководства", about: "О проекте", github: "GitHub" },
        account: { login: "Войти / Регистрация", menu: "Меню аккаунта", label: "Аккаунт", hub: "Мой OpenAkita", marketplaceLibrary: "Marketplace: полученные ресурсы", passConsole: "OpenAkita Pass: консоль", security: "Вход и безопасность", entitlements: "Права и License", logout: "Выйти", unavailable: "Сервис аккаунта временно недоступен" },
        footerTagline: "Self-Evolving AI Agent: Учится, адаптируется, никогда не сдаётся.",
        tutorialBackToTop: "Наверх",
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
          btnChat: "Веб-чат",
        },
      },
      download: { hero: { title: "Скачать OpenAkita", desc: "Доступны Desktop, CLI, Docker и установка из исходного кода." } },
      tutorials: {
        hero: { title: "Центр руководств", desc: "Просматривайте руководства по установке и настройке по категориям." },
        search: {
          placeholder: "Поиск руководств…",
          empty: "Подходящие руководства не найдены",
          label: "Поиск руководств",
        },
      },
      setup: {
        hero: { title: "Начальная установка", desc: "Пошаговый гайд для Desktop и CLI." },
        side: ["Обзор", "Требования", "Установка OpenAkita", "Проверка запуска"],
      },
      im: {
        hero: {
          title: "Настройка IM-каналов",
          desc: "Подключение платформ и конфигурация (включая QQ и WeChat).",
          back: "Назад в центр руководств",
          eyebrow: "Руководство / IM-каналы",
        },
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
          back: "Назад в центр руководств",
          eyebrow: "Руководства / LLM-эндпоинты",
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
      installDesktop: {
        hero: { back: "Назад в центр руководств", eyebrow: "Руководство / Установка / Windows Desktop" },
      },
      installPypi: {
        hero: { back: "Назад в центр руководств", eyebrow: "Руководство / Установка / Linux" },
      },
      installDocker: {
        hero: { back: "Назад в центр руководств", eyebrow: "Руководство / Установка / Docker" },
      },
      webSearch: {
        meta: {
          title: "Руководство по настройке источников веб-поиска",
          description: "Сравнение и настройка Bocha, Tavily, SearXNG, Jina и DuckDuckGo в OpenAkita.",
        },
        hero: {
          title: "Настройка источников веб-поиска",
          desc: "На базе OpenAkita v1.27.20.",
          back: "Назад в центр руководств",
          eyebrow: "Руководство / Веб-поиск",
        },
        side: ["Сравнение источников", "Bocha", "Tavily", "SearXNG", "Jina"],
      },
      about: { hero: { title: "О нас", desc: "Видение OpenAkita и сообщество." } },
      services: { hero: { title: "Продукты и услуги", desc: "От универсального помощника до корпоративных решений." } },
      terms: { hero: { title: "Условия использования", desc: "Последнее обновление: 11 марта 2026 г." } },
      privacy: { hero: { title: "Политика конфиденциальности", desc: "Последнее обновление: 12 октября 2026 г." } },
    },
    fr: {
      common: {
        navToggle: "Ouvrir la navigation",
        navClose: "Fermer la navigation",
        skipToContent: "Aller au contenu principal",
        language: "Langue",
        nav: { home: "Accueil", download: "Télécharger", marketplace: "Marketplace", services: "Services", scenarios: "Cas d'usage", tutorials: "Tutoriels", about: "À propos", github: "GitHub" },
        account: { login: "Connexion / Inscription", menu: "Menu du compte", label: "Compte", hub: "Mon OpenAkita", marketplaceLibrary: "Marketplace : ressources acquises", passConsole: "OpenAkita Pass : console", security: "Connexion et sécurité", entitlements: "Droits et License", logout: "Se déconnecter", unavailable: "Le service de compte est temporairement indisponible" },
        footerTagline: "Self-Evolving AI Agent : Apprendre, s'adapter, ne jamais abandonner.",
        tutorialBackToTop: "Retour en haut",
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
          btnChat: "Chat en ligne",
        },
      },
      download: { hero: { title: "Télécharger OpenAkita", desc: "Installation Desktop, CLI, Docker et depuis les sources." } },
      tutorials: {
        hero: { title: "Centre de tutoriels", desc: "Parcourez les tutoriels d'installation et de configuration par catégorie." },
        search: {
          placeholder: "Rechercher des tutoriels…",
          empty: "Aucun tutoriel correspondant trouvé",
          label: "Rechercher des tutoriels",
        },
      },
      setup: {
        hero: { title: "Installation initiale", desc: "Guide Desktop et CLI étape par étape." },
        side: ["Aperçu", "Prérequis", "Installer OpenAkita", "Vérification du démarrage"],
      },
      im: {
        hero: {
          title: "Configuration des canaux IM",
          desc: "Onboarding des plateformes et intégration (QQ et WeChat inclus).",
          back: "Retour au centre de tutoriels",
          eyebrow: "Tutoriel / Canaux IM",
        },
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
          back: "Retour au centre de tutoriels",
          eyebrow: "Tutoriels / Endpoints LLM",
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
      installDesktop: {
        hero: { back: "Retour au centre de tutoriels", eyebrow: "Tutoriel / Installation / Windows Desktop" },
      },
      installPypi: {
        hero: { back: "Retour au centre de tutoriels", eyebrow: "Tutoriel / Installation / Linux" },
      },
      installDocker: {
        hero: { back: "Retour au centre de tutoriels", eyebrow: "Tutoriel / Installation / Docker" },
      },
      webSearch: {
        meta: {
          title: "Guide de configuration des sources de recherche web",
          description: "Comparer et configurer Bocha, Tavily, SearXNG, Jina et DuckDuckGo dans OpenAkita.",
        },
        hero: {
          title: "Configuration des sources de recherche web",
          desc: "Basé sur OpenAkita v1.27.20.",
          back: "Retour au centre de tutoriels",
          eyebrow: "Tutoriel / Recherche web",
        },
        side: ["Comparaison des sources", "Bocha", "Tavily", "SearXNG", "Jina"],
      },
      about: { hero: { title: "À propos", desc: "Vision OpenAkita et communauté." } },
      services: { hero: { title: "Produits et services", desc: "De l'assistant open source aux solutions d'entreprise sur mesure." } },
      terms: { hero: { title: "Conditions d'utilisation", desc: "Dernière mise à jour : 11 mars 2026" } },
      privacy: { hero: { title: "Politique de confidentialité", desc: "Dernière mise à jour : 12 octobre 2026" } },
    },
    de: {
      common: {
        navToggle: "Navigation öffnen",
        navClose: "Navigation schließen",
        skipToContent: "Zum Hauptinhalt springen",
        language: "Sprache",
        nav: { home: "Start", download: "Download", marketplace: "Marketplace", services: "Dienste", scenarios: "Anwendungen", tutorials: "Tutorials", about: "Über uns", github: "GitHub" },
        account: { login: "Anmelden / Registrieren", menu: "Kontomenü", label: "Konto", hub: "Mein OpenAkita", marketplaceLibrary: "Marketplace: erworbene Ressourcen", passConsole: "OpenAkita Pass: Konsole", security: "Anmeldung und Sicherheit", entitlements: "Berechtigungen und License", logout: "Abmelden", unavailable: "Der Kontodienst ist vorübergehend nicht verfügbar" },
        footerTagline: "Self-Evolving AI Agent: Lernen, anpassen, nie aufgeben.",
        tutorialBackToTop: "Nach oben",
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
          btnChat: "Web-Chat",
        },
      },
      download: { hero: { title: "OpenAkita herunterladen", desc: "Desktop-, CLI-, Docker- und Source-Installation verfügbar." } },
      tutorials: {
        hero: { title: "Tutorial-Zentrum", desc: "Installations- und Konfigurationstutorials nach Kategorie durchsuchen." },
        search: {
          placeholder: "Tutorials suchen…",
          empty: "Keine passenden Tutorials gefunden",
          label: "Tutorials suchen",
        },
      },
      setup: {
        hero: { title: "Ersteinrichtung", desc: "Schritt-für-Schritt für Desktop und CLI." },
        side: ["Überblick", "Voraussetzungen", "OpenAkita installieren", "Startprüfung"],
      },
      im: {
        hero: {
          title: "IM-Kanal-Konfiguration",
          desc: "Plattform-Onboarding und Integration (inkl. QQ und WeChat).",
          back: "Zurück zum Tutorial-Zentrum",
          eyebrow: "Tutorial / IM-Kanäle",
        },
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
          back: "Zurück zum Tutorial-Zentrum",
          eyebrow: "Tutorials / LLM-Endpunkte",
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
      installDesktop: {
        hero: { back: "Zurück zum Tutorial-Zentrum", eyebrow: "Tutorial / Installation / Windows Desktop" },
      },
      installPypi: {
        hero: { back: "Zurück zum Tutorial-Zentrum", eyebrow: "Tutorial / Installation / Linux" },
      },
      installDocker: {
        hero: { back: "Zurück zum Tutorial-Zentrum", eyebrow: "Tutorial / Installation / Docker" },
      },
      webSearch: {
        meta: {
          title: "Anleitung zur Konfiguration von Web-Suchquellen",
          description: "Vergleich und Einrichtung von Bocha, Tavily, SearXNG, Jina und DuckDuckGo in OpenAkita.",
        },
        hero: {
          title: "Web-Suchquellen konfigurieren",
          desc: "Basierend auf OpenAkita v1.27.20.",
          back: "Zurück zum Tutorial-Zentrum",
          eyebrow: "Tutorial / Web-Suche",
        },
        side: ["Quellenvergleich", "Bocha", "Tavily", "SearXNG", "Jina"],
      },
      about: { hero: { title: "Über uns", desc: "Vision und Community von OpenAkita." } },
      services: { hero: { title: "Produkte und Dienste", desc: "Vom Open-Source-Universalassistenten bis zur maßgeschneiderten Unternehmenslösung." } },
      terms: { hero: { title: "Nutzungsbedingungen", desc: "Letzte Aktualisierung: 11. März 2026" } },
      privacy: { hero: { title: "Datenschutzrichtlinie", desc: "Letzte Aktualisierung: 12. Oktober 2026" } },
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
    let saved;
    try { saved = localStorage.getItem("openakita_language"); } catch (_) {}
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    const browserCandidates = Array.isArray(navigator.languages) && navigator.languages.length > 0 ? navigator.languages : [navigator.language || "zh-CN"];
    for (const tag of browserCandidates) {
      const normalized = tag.toLowerCase().split("-")[0];
      if (SUPPORTED_LANGS.includes(normalized)) return normalized;
    }
    return "zh";
  }

  function resolvePageKey() {
    const path = (window.location.pathname || "").toLowerCase();
    if (document.body.dataset.page === "chat") return "chat";
    if (path === "/account" || path.startsWith("/account/")) return "accountHub";
    if (path.includes("/tutorials/im-channels")) return "im";
    if (path.includes("/tutorials/llm-endpoints")) return "llm";
    if (path.includes("/tutorials/web-search-source")) return "webSearch";
    if (path.includes("/tutorials/install/desktop")) return "installDesktop";
    if (path.includes("/tutorials/install/pypi")) return "installPypi";
    if (path.includes("/tutorials/install/docker")) return "installDocker";
    if (path === "/tutorials" || path === "/tutorials/" || path.endsWith("/tutorials/index.html")) return "tutorials";
    if (path.startsWith("/tutorials/")) return null;
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
  var blockOriginalMap = new WeakMap();
  var blockOriginalHtmlMap = new WeakMap();

  function applyBlockTranslations() {
    document.querySelectorAll("[data-i18n-block]").forEach(function (el) {
      if (!blockOriginalHtmlMap.has(el)) {
        blockOriginalHtmlMap.set(el, el.innerHTML);
        var source = el.getAttribute("data-i18n-block") || collapseWhitespaceForI18nLookup(el.textContent);
        blockOriginalMap.set(el, source);
      }

      if (currentLanguage === "zh") {
        el.innerHTML = blockOriginalHtmlMap.get(el);
        return;
      }

      var pack = languagePacks[currentLanguage];
      if (!pack || !CONTENT_TRANSLATE_LANGS.has(currentLanguage)) return;

      var translated = lookupLanguagePackString(blockOriginalMap.get(el), pack);
      if (translated && translated.trim()) {
        el.textContent = translated;
      }
    });
  }

  function loadLanguagePack(lang) {
    if (lang === "zh") return Promise.resolve(null);
    if (languagePacks[lang]) return Promise.resolve(languagePacks[lang]);
    if (loadingPacks[lang]) return loadingPacks[lang];

    var promise = fetch("/assets/i18n/" + lang + ".json?v=20260611-web-search-source")
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
    applyBlockTranslations();
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

        if (parent.closest("script,style,noscript,textarea,code,pre,.code-block,[data-i18n-managed],[data-i18n-block]")) {
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
    function setImageVisible(img, visible) {
      img.hidden = !visible;
      var figure = img.closest("figure");
      if (figure) figure.hidden = !visible;
    }

    var imgs = document.querySelectorAll("[data-i18n-img]");
    imgs.forEach(function (img) {
      if (!originalImgSrcMap.has(img)) {
        originalImgSrcMap.set(img, img.getAttribute("src"));
      }
      var zhSrc = originalImgSrcMap.get(img);

      if (currentLanguage === "zh") {
        img.setAttribute("src", zhSrc);
        setImageVisible(img, true);
        return;
      }

      var langSrc = zhSrc.replace("/zh/", "/" + currentLanguage + "/");
      var probe = new Image();
      probe.onload = function () {
        window.setTimeout(function () {
          if (probe.naturalWidth > 0 || probe.naturalHeight > 0) {
            img.setAttribute("src", langSrc);
            setImageVisible(img, true);
          } else {
            img.setAttribute("src", zhSrc);
            setImageVisible(img, true);
          }
        }, 0);
      };
      probe.onerror = function () {
        img.setAttribute("src", zhSrc);
        setImageVisible(img, true);
      };
      probe.src = langSrc;
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
    if (!pageKey) return;
    const title = t(pageKey + ".meta.title");
    const description = t(pageKey + ".meta.description");
    if (title) document.title = title;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta && description) descMeta.setAttribute("content", description);
  }

  function applyMarketplaceTexts() {
    const scripts = document.querySelectorAll("script[data-marketplace-copy]");
    if (!scripts.length) return;

    let copy = {};
    scripts.forEach(function (script) {
      try {
        const parsed = JSON.parse(script.textContent || "{}");
        Object.keys(parsed).forEach(function (language) {
          copy[language] = Object.assign({}, copy[language] || {}, parsed[language]);
        });
      } catch (error) {
        console.warn("Unable to read Marketplace translations", error);
      }
    });

    const translations = copy[currentLanguage] || copy.en || copy.zh || {};
    const fallback = copy.en || copy.zh || {};
    document.querySelectorAll("[data-marketplace-text]").forEach(function (node) {
      const key = node.getAttribute("data-marketplace-text");
      if (!key) return;
      const value = translations[key] || fallback[key];
      if (typeof value === "string") {
        node.textContent = value;
        node.dataset.i18nManaged = "";
      }
    });
  }

  function applyCommonTexts() {
    const navigationToggle = document.querySelector(".nav-toggle");
    const navigationExpanded = navigationToggle && navigationToggle.getAttribute("aria-expanded") === "true";
    setAttr(".nav-toggle", "aria-label", t(navigationExpanded ? "common.navClose" : "common.navToggle"));
    setText(".skip-link", t("common.skipToContent"));
    setText('.main-nav a[data-nav="home"]', t("common.nav.home"));
    setText('.main-nav a[data-nav="download"]', t("common.nav.download"));
    setText('.main-nav a[data-nav="chat"]', t("home.hero.btnChat"));
    setText('.main-nav a[data-nav="marketplace"]', t("common.nav.marketplace"));
    setText('.main-nav a[data-nav="services"]', t("common.nav.services"));
    setText('.main-nav a[data-nav="scenarios"]', t("common.nav.scenarios"));
    setText('.main-nav a[data-nav="tutorials"]', t("common.nav.tutorials"));
    setText('.main-nav a[data-nav="about"]', t("common.nav.about"));
    setText(".lang-label", t("common.language"));
    setAttr(".lang-select", "aria-label", t("common.language"));
    setText("[data-account-login]", t("common.account.login"));
    setAttr("[data-account-trigger]", "aria-label", t("common.account.menu"));
    setText('[data-account-link="hub"]', t("common.account.hub"));
    setText('[data-account-link="marketplace_library"]', t("common.account.marketplaceLibrary"));
    setText('[data-account-link="pass_console"]', t("common.account.passConsole"));
    setText('[data-account-link="account_security"]', t("common.account.security"));
    setText('[data-account-link="account_entitlements"]', t("common.account.entitlements"));
    setText("[data-account-logout]", t("common.account.logout"));
    const accountShell = document.querySelector("[data-account-shell]");
    if (accountShell && !["authenticated", "preview"].includes(accountShell.dataset.state)) {
      setText("[data-account-label]", t("common.account.label"));
    }
    if (accountShell && accountShell.dataset.state === "unavailable") {
      setText("[data-account-status]", t("common.account.unavailable"));
    }
    setText(".footer-tagline", t("common.footerTagline"));
    updateTutorialBackToTopLabel();

    applyFooterTexts();
    applyMarketplaceTexts();
  }

  function isTutorialPage() {
    const path = (window.location.pathname || "").replace(/\/+$/, "").toLowerCase();
    return path === "/tutorials" || path.endsWith("/tutorials/index.html") || path.indexOf("/tutorials/") !== -1;
  }

  function updateTutorialBackToTopLabel() {
    const button = document.querySelector("[data-tutorial-back-to-top]");
    if (!button) return;
    const label = t("common.tutorialBackToTop");
    const labelNode = button.querySelector(".tutorial-back-to-top-label");
    if (labelNode) {
      labelNode.textContent = label;
      labelNode.dataset.i18nManaged = "";
    }
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  }

  function initTutorialBackToTop() {
    if (!isTutorialPage() || document.querySelector("[data-tutorial-back-to-top]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "tutorial-back-to-top";
    button.setAttribute("data-tutorial-back-to-top", "");
    button.setAttribute("aria-label", t("common.tutorialBackToTop"));

    const icon = document.createElement("img");
    icon.className = "tutorial-back-to-top-icon";
    icon.src = "/assets/img/icons/arrow-right.svg";
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);

    const label = document.createElement("span");
    label.className = "tutorial-back-to-top-label";
    label.textContent = t("common.tutorialBackToTop");
    label.dataset.i18nManaged = "";
    button.appendChild(label);

    button.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    let ticking = false;
    function updateVisibility() {
      const shouldShow = window.scrollY > 360;
      button.classList.toggle("is-visible", shouldShow);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(updateVisibility);
        }
      },
      { passive: true }
    );

    updateVisibility();
    document.body.appendChild(button);
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

  function applyHomePrimaryAction() {
    setInlineLabel("#downloadDesktopButton", t("home.hero.btnDownload"));
    if (!window.OpenAkitaChatEntry?.enabled) return;
    document.querySelectorAll("[data-home-primary-action]").forEach(function (link) {
      const action = link.getAttribute("data-home-primary-action");
      setInlineLabel('[data-home-primary-action="' + action + '"]', t("home.hero.btnChat"));
      link.setAttribute("href", "/chat/");
      const icon = link.querySelector("img");
      if (icon) {
        icon.setAttribute("src", "/assets/img/icons/chat.svg");
        icon.setAttribute("alt", "");
      }
    });
  }

  function applyHomeTexts() {
    setText("#heroTypedTitle", getHomeHeroSubtitle(t("home.hero.title"), "让私人AI随时陪伴"));
    setText("#heroSloganText", t("home.hero.slogan"));
    setText(".hero .hero-lead", t("home.hero.desc"));
    applyHomePrimaryAction();
    setInlineLabel("#heroSetupButton", t("home.hero.btnSetup"));
    setInlineLabel('.hero .hero-actions a[href="/tutorials/"]:not(#heroSetupButton)', t("home.hero.btnTutorials"));
    startHomeHeroTyping();
  }

  function applyDownloadTexts() {
    setText(".page-hero h1", t("download.hero.title"));
    setText(".page-hero p", t("download.hero.desc"));
  }

  function isTutorialsIndexPage() {
    const path = (window.location.pathname || "").replace(/\/+$/, "").toLowerCase();
    return path === "/tutorials" || path.endsWith("/tutorials/index.html");
  }

  function applyTutorialIndexTexts() {
    if (!isTutorialsIndexPage()) return;
    setText(".page-hero h1", t("tutorials.hero.title"));
    setText(".page-hero .hero-lead", t("tutorials.hero.desc"));
  }


  function applyTutorialDetailHero(sectionKey) {
    if (document.querySelector(".page-hero-back span")) {
      setText(".page-hero-back span", t(sectionKey + ".hero.back"));
    }
    if (document.querySelector(".page-hero .eyebrow")) {
      setText(".page-hero .eyebrow", t(sectionKey + ".hero.eyebrow"));
    }
  }

  function applyImTexts() {
    applyTutorialDetailHero("im");
    setText(".page-hero h1", t("im.hero.title"));
    setText(".page-hero p", t("im.hero.desc"));
    setList(".side-nav a", tArray("im.side"));
  }

  function applyLlmTexts() {
    applyTutorialDetailHero("llm");
    setText(".page-hero h1", t("llm.hero.title"));
    setText(".page-hero p", t("llm.hero.desc"));
    setList(".side-nav a", tArray("llm.side"));
  }

  function applyWebSearchTexts() {
    applyTutorialDetailHero("webSearch");
    setText(".page-hero h1", t("webSearch.hero.title"));
    setList(".side-nav a", tArray("webSearch.side"));
  }

  function applyInstallDetailTexts(sectionKey) {
    applyTutorialDetailHero(sectionKey);
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
    if (!pageKey) return;
    if (pageKey === "home") applyHomeTexts();
    if (pageKey === "download") applyDownloadTexts();
    if (pageKey === "tutorials") applyTutorialIndexTexts();
    if (pageKey === "im") applyImTexts();
    if (pageKey === "llm") applyLlmTexts();
    if (pageKey === "webSearch") applyWebSearchTexts();
    if (pageKey === "installDesktop") applyInstallDetailTexts("installDesktop");
    if (pageKey === "installPypi") applyInstallDetailTexts("installPypi");
    if (pageKey === "installDocker") applyInstallDetailTexts("installDocker");
    if (pageKey === "about") applyAboutTexts();
    if (pageKey === "services") applyServicesTexts();
    if (pageKey === "terms") applyTermsTexts();
    if (pageKey === "privacy") applyPrivacyTexts();
  }

  function initLanguageSwitcher(pageKey) {
    const select = document.querySelector(".lang-select");
    if (!select) return;
    select.value = currentLanguage;
    function changeLanguage(targetLang, remember) {
      currentLanguage = targetLang;
      select.value = currentLanguage;
      if (remember) { try { localStorage.setItem("openakita_language", currentLanguage); } catch (_) {} }
      document.documentElement.lang = LANG_TO_LOCALE[currentLanguage] || "en-US";

      applyMeta(pageKey);
      applyCommonTexts();
      applyPageTexts(pageKey);
      initLocalizedVideos();
      applyHomeRevealStagger();
      enhanceCodeBlocks();

      applyImageTranslations();
      if (pageKey === "chat") document.dispatchEvent(new CustomEvent("openakita:language-changed"));

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
    }
    select.addEventListener("change", function () { changeLanguage(normalizeLanguageTag(select.value), true); });
    window.addEventListener("storage", function (event) {
      if (event.key !== "openakita_language") return;
      const language = event.newValue && SUPPORTED_LANGS.includes(event.newValue) ? event.newValue : detectLanguage();
      if (language !== currentLanguage) changeLanguage(language, false);
    });
  }

  function currentReturnPath() {
    const path = window.location.pathname + window.location.search;
    return path.startsWith("/") && !path.startsWith("//") ? path : "/";
  }

  function defaultLoginUrl() {
    return "/auth/login?return_to=" + encodeURIComponent(currentReturnPath());
  }

  function safeAccountLink(value, fallback) {
    if (typeof value !== "string" || !value) return fallback;
    try {
      const url = new URL(value, window.location.origin);
      const sameOrigin = url.origin === window.location.origin;
      if ((!sameOrigin && url.protocol !== "https:") || url.username || url.password) return fallback;
      return sameOrigin ? url.pathname + url.search + url.hash : url.href;
    } catch (_) {
      return fallback;
    }
  }

  function safeLoginLink(value, fallback) {
    const link = safeAccountLink(value, fallback);
    try {
      const url = new URL(link, window.location.origin);
      return url.origin === window.location.origin && url.pathname === "/auth/login" ? link : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function initialsForName(name) {
    const parts = String(name || "OpenAkita").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "OA";
    return parts.slice(0, 2).map(function (part) { return Array.from(part)[0] || ""; }).join("").toUpperCase();
  }

  function initAccountShell() {
    if (document.body.dataset.page === "chat") return;
    const shell = document.querySelector("[data-account-shell]");
    const loginLink = document.querySelector("[data-account-login]");
    const menu = document.querySelector("[data-account-menu]");
    const trigger = document.querySelector("[data-account-trigger]");
    const popover = document.querySelector("[data-account-popover]");
    const nameNode = document.querySelector("[data-account-name]");
    const labelNode = document.querySelector("[data-account-label]");
    const avatar = document.querySelector("[data-account-avatar]");
    const avatarFallback = document.querySelector("[data-account-avatar-fallback]");
    const status = document.querySelector("[data-account-status]");
    const logoutButton = document.querySelector("[data-account-logout]");

    if (!shell || !loginLink || !menu || !trigger || !popover || !nameNode || !labelNode || !avatar || !avatarFallback || !status || !logoutButton) return;

    const fallbackLogin = defaultLoginUrl();
    const accountPreview = window.OpenAkitaAccountPreview;
    loginLink.setAttribute("href", fallbackLogin);

    function closeMenu(restoreFocus) {
      popover.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }

    function openMenu(focusFirst) {
      popover.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      if (focusFirst) {
        const first = popover.querySelector('[role="menuitem"]');
        if (first) first.focus();
      }
    }

    trigger.addEventListener("click", function () {
      if (popover.hidden) openMenu(false);
      else closeMenu(false);
    });

    trigger.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        openMenu(true);
      }
    });

    popover.addEventListener("keydown", function (event) {
      const items = Array.from(popover.querySelectorAll('[role="menuitem"]'));
      const currentIndex = items.indexOf(document.activeElement);
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + direction + items.length) % items.length;
        items[nextIndex].focus();
      } else if (event.key === "Home" && items.length) {
        event.preventDefault();
        items[0].focus();
      } else if (event.key === "End" && items.length) {
        event.preventDefault();
        items[items.length - 1].focus();
      }
    });

    menu.addEventListener("focusout", function () {
      window.setTimeout(function () {
        if (!menu.contains(document.activeElement)) closeMenu(false);
      }, 0);
    });

    document.addEventListener("click", function (event) {
      if (!menu.contains(event.target)) closeMenu(false);
    });

    avatar.addEventListener("error", function () {
      avatar.hidden = true;
      avatar.removeAttribute("src");
      avatarFallback.hidden = false;
      if (accountPreview && shell.dataset.state === "authenticated") accountPreview.save(true);
    });
    if (!avatar.hidden && avatar.complete && avatar.naturalWidth === 0) {
      avatar.hidden = true;
      avatar.removeAttribute("src");
      avatarFallback.hidden = false;
    }

    logoutButton.addEventListener("click", async function () {
      const csrfToken = shell.dataset.csrfToken;
      if (!csrfToken) return;
      logoutButton.disabled = true;
      status.textContent = "";
      try {
        const response = await fetch("/auth/logout", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "X-CSRF-Token": csrfToken,
          },
        });
        let redirectUrl = response.redirected ? response.url : "";
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const body = await response.json();
          redirectUrl = body.logout_url || body.redirect_url || redirectUrl;
        }
        if (!response.ok) throw new Error("logout_failed");
        if (accountPreview) accountPreview.clear();
        window.location.assign(safeAccountLink(redirectUrl, "/"));
      } catch (_) {
        status.textContent = t("common.account.unavailable");
        logoutButton.disabled = false;
      }
    });

    let sessionRequest = null;
    function refreshIdentity(force) {
      if (sessionRequest) sessionRequest.abort();
      const controller = new AbortController();
      sessionRequest = controller;
      const timeout = window.setTimeout(function () { controller.abort(); }, 4000);
      fetch("/api/v1/session" + (force ? "?refresh=1" : ""), {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
        .then(function (response) {
          if (!response.ok || !(response.headers.get("content-type") || "").includes("application/json")) {
            throw new Error("session_unavailable");
          }
          return response.json();
        })
        .then(function (session) {
          if (sessionRequest !== controller) return;
          if (!session || session.authenticated !== true || !session.user) {
            closeMenu(false);
            shell.dataset.state = "anonymous";
            loginLink.hidden = false;
            menu.hidden = true;
            shell.dataset.csrfToken = "";
            status.textContent = "";
            loginLink.setAttribute("href", safeLoginLink(session && session.login_url, fallbackLogin));
            if (accountPreview) accountPreview.save(false);
            return;
          }

          const displayName = typeof session.user.display_name === "string" && session.user.display_name.trim()
            ? session.user.display_name.trim()
            : "OpenAkita";
          const accountLabel = typeof session.user.email_label === "string" && session.user.email_label.trim()
            ? session.user.email_label.trim()
            : t("common.account.label");
          const links = session.links || {};
          status.textContent = "";

          shell.dataset.state = "authenticated";
          shell.dataset.csrfToken = typeof session.csrf_token === "string" ? session.csrf_token : "";
          loginLink.hidden = true;
          menu.hidden = false;
          nameNode.textContent = displayName;
          labelNode.textContent = accountLabel;
          avatarFallback.textContent = initialsForName(displayName);

          const avatarUrl = safeAccountLink(session.user.avatar_url, "");
          if (avatarUrl && avatarUrl.startsWith("https://")) {
            if (avatar.getAttribute("src") !== avatarUrl) avatar.setAttribute("src", avatarUrl);
            avatar.hidden = false;
            avatarFallback.hidden = true;
          } else {
            avatar.removeAttribute("src");
            avatar.hidden = true;
            avatarFallback.hidden = false;
          }

          const marketplaceLink = document.querySelector('[data-nav="marketplace"]');
          const marketplaceFallback = marketplaceLink ? marketplaceLink.getAttribute("href") + "library" : "/";
          const linkFallbacks = {
            hub: "/account",
            marketplace_library: marketplaceFallback,
            pass_console: "/account",
            account_security: "/account",
            account_entitlements: "/account",
          };
          Object.keys(linkFallbacks).forEach(function (key) {
            const link = document.querySelector('[data-account-link="' + key + '"]');
            if (link) link.setAttribute("href", safeAccountLink(links[key], linkFallbacks[key]));
          });
          if (accountPreview) accountPreview.save(true);
        })
        .catch(function () {
          if (sessionRequest !== controller) return;
          shell.dataset.state = "unavailable";
          loginLink.hidden = !menu.hidden;
          loginLink.setAttribute("href", fallbackLogin);
          status.textContent = t("common.account.unavailable");
        })
        .finally(function () {
          window.clearTimeout(timeout);
          if (sessionRequest === controller) {
            shell.setAttribute("aria-busy", "false");
            sessionRequest = null;
          }
        });
    }
    refreshIdentity(false);
    window.addEventListener("pageshow", function (event) {
      if (event.persisted) refreshIdentity(true);
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refreshIdentity(true);
    });
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
    function setNavigationOpen(open, restoreFocus) {
      nav.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", t(open ? "common.navClose" : "common.navToggle"));
      if (restoreFocus) navToggle.focus();
    }

    navToggle.addEventListener("click", function () {
      setNavigationOpen(!nav.classList.contains("open"), false);
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setNavigationOpen(false, false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("open")) {
        setNavigationOpen(false, true);
      }
    });

    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 1121px)").matches) setNavigationOpen(false, false);
    });
  }

  function markRevealVisible(el) {
    el.classList.add("is-visible");
  }

  function isRevealInViewport(el) {
    const rect = el.getBoundingClientRect();
    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.top < viewHeight && rect.bottom > 0;
  }

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length > 0) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            markRevealVisible(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0 }
    );
    reveals.forEach(function (el) {
      // Tall tutorial columns fail threshold: 0.01 until enough height enters the viewport.
      if (el.closest(".tutorial-shell")) {
        markRevealVisible(el);
        return;
      }
      if (isRevealInViewport(el)) {
        markRevealVisible(el);
        return;
      }
      observer.observe(el);
    });
  } else {
    reveals.forEach(markRevealVisible);
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
      activeLink.setAttribute("aria-current", "page");
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
  initLanguageSwitcher(pageKey);
  initAccountShell();
  enhanceCodeBlocks();
  initSetupInstallDrawer();
  initSceneNav();
  initTutorialCategorySearch();
  initTutorialBackToTop();

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
          { id: "drawer-desktop-full-llm",      label: "4.1 大模型端点配置（必填）" },
          { id: "drawer-desktop-full-im",       label: "4.2 IM 通道" },
          { id: "drawer-desktop-full-tools",    label: "4.3 工具与技能" },
          { id: "drawer-desktop-full-soul",     label: "4.4 灵魂与意志" },
          { id: "drawer-desktop-full-advanced", label: "4.5 高级配置" },
          { id: "drawer-desktop-full-multi",    label: "4.6 多 Agent 模式" },
          { id: "drawer-desktop-full-done",     label: "4.7 完成" },
        ],
      },
      pypi: {
        title: "方式二：Linux",
        templateId: "setup-drawer-template-pypi",
        chapters: [
          {
            label: "Linux CLI",
            children: [
              { id: "drawer-pypi-prereq", label: "一、环境要求" },
              { id: "drawer-pypi-install", label: "二、安装步骤" },
              { id: "drawer-pypi-first-run", label: "三、首次运行" },
              { id: "drawer-pypi-verify", label: "四、日常使用" },
              { id: "drawer-pypi-script", label: "五、可选：官方一键脚本" },
              { id: "drawer-pypi-faq", label: "六、常见问题" },
              { id: "drawer-pypi-cheatsheet", label: "七、完整命令速查" },
            ],
          },
          {
            label: "Linux GUI",
            children: [
              { id: "drawer-pypi-gui-prereq", label: "1、前置条件" },
              { id: "drawer-pypi-gui-download", label: "2、下载安装包" },
              { id: "drawer-pypi-gui-install", label: "3、正式安装" },
              { id: "drawer-pypi-gui-start", label: "4、启动与配置" },
              { id: "drawer-pypi-gui-wizard", label: "4.1 初次配置（配置向导）" },
              { id: "drawer-pypi-gui-full-overview", label: "4.2 完整配置" },
              { id: "drawer-pypi-gui-full-llm", label: "4.2.1 大模型端点配置（必填）" },
              { id: "drawer-pypi-gui-full-im", label: "4.2.2 IM 通道" },
              { id: "drawer-pypi-gui-full-tools", label: "4.2.3 工具与技能" },
              { id: "drawer-pypi-gui-full-soul", label: "4.2.4 灵魂与意志" },
              { id: "drawer-pypi-gui-full-advanced", label: "4.2.5 高级配置" },
              { id: "drawer-pypi-gui-full-multi", label: "4.2.6 多 Agent 模式" },
              { id: "drawer-pypi-gui-full-done", label: "4.2.7 完成" },
            ],
          },
        ],
      },
      docker: {
        title: "方式三：Docker 安装",
        templateId: "setup-drawer-template-docker",
        chapters: [
          { id: "drawer-docker-prereq", label: "一、环境要求" },
          { id: "drawer-docker-install", label: "二、安装步骤" },
          { id: "drawer-docker-deploy", label: "三、部署 OpenAkita" },
          { id: "drawer-docker-access", label: "四、访问 OpenAkita" },
          { id: "drawer-docker-commands", label: "五、常用管理命令" },
          { id: "drawer-docker-troubleshoot", label: "六、故障排查" },
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

      function bindNavScrollLinks(root) {
        root.querySelectorAll("a[href^='#']").forEach(function (link) {
          link.addEventListener("click", function (event) {
            event.preventDefault();
            const id = link.getAttribute("href").slice(1);
            const target = contentNode.querySelector("#" + id);
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          });
        });
      }

      function appendChapterLink(chapter, container) {
        const link = document.createElement("a");
        link.href = "#" + chapter.id;
        link.textContent = translatePackString(chapter.label);
        const match = chapter.label.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
        if (match) {
          if (match[3] !== undefined) link.classList.add("setup-nav-l3");
          else if (match[2] !== undefined) link.classList.add("setup-nav-l2");
          else link.classList.add("setup-nav-l1");
        } else if (/^[一二三四五六七八九十]+、/.test(chapter.label)) {
          link.classList.add("setup-nav-l2");
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
        container.appendChild(link);
      }

      const navTemplate = document.getElementById("setup-drawer-nav-" + method);
      if (navTemplate) {
        navNode.appendChild(navTemplate.content.cloneNode(true));
        bindNavScrollLinks(navNode);
      } else {
      config.chapters.forEach(function (chapter) {
        if (chapter.children && chapter.children.length) {
          const group = document.createElement("details");
          group.className = "setup-drawer-nav-group";

          const summary = document.createElement("summary");
          summary.className = "setup-drawer-nav-group-title";
          summary.textContent = translatePackString(chapter.label);
          group.appendChild(summary);

          const items = document.createElement("div");
          items.className = "setup-drawer-nav-group-items";
          chapter.children.forEach(function (child) {
            appendChapterLink(child, items);
          });
          group.appendChild(items);
          navNode.appendChild(group);
          return;
        }

        appendChapterLink(chapter, navNode);
      });
      }

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
    var GH_API_BASE = (function () {
      var h = location.hostname;
      var port = location.port;
      if (port && port !== "80" && port !== "443") return "/gh-api";
      if (h === "localhost" || h === "127.0.0.1" || /^192\.168\./.test(h) || /^10\./.test(h) || /\.local$/i.test(h)) return "/gh-api";
      var isProdHost = h === "openakita.ai" || h === "www.openakita.ai";
      return isProdHost && location.protocol === "https:" ? "https://api.github.com" : "/gh-api";
    })();
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

    fetch(GH_API_BASE + "/repos/" + REPO)
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

  function initTutorialCategorySearch() {
    var panels = document.querySelectorAll("[data-tutorial-search-panel]");
    if (!panels.length) return;

    function normalizeSearchText(str) {
      return String(str || "").toLowerCase().replace(/\s+/g, " ").trim();
    }

    function fuzzyMatch(haystack, needle) {
      if (!needle) return true;
      var h = normalizeSearchText(haystack);
      var n = normalizeSearchText(needle);
      if (!n) return true;
      if (h.indexOf(n) !== -1) return true;
      var hi = 0;
      for (var ni = 0; ni < n.length; ni++) {
        var found = false;
        while (hi < h.length) {
          if (h.charAt(hi) === n.charAt(ni)) {
            found = true;
            hi++;
            break;
          }
          hi++;
        }
        if (!found) return false;
      }
      return true;
    }

    function getCardSearchText(card) {
      var parts = [];
      card.querySelectorAll("h3, p, .actions a").forEach(function (el) {
        parts.push(el.textContent || "");
      });
      return parts.join(" ");
    }

    function applyTutorialSearchLabels() {
      document.querySelectorAll(".tutorial-category-search-input").forEach(function (input) {
        input.placeholder = t("tutorials.search.placeholder") || "搜索教程…";
        input.setAttribute("aria-label", t("tutorials.search.label") || "搜索教程");
      });
      document.querySelectorAll(".tutorial-search-empty p").forEach(function (p) {
        p.textContent = t("tutorials.search.empty") || "未找到匹配的教程";
      });
    }

    function filterPanel(panel) {
      var input = panel.querySelector(".tutorial-category-search-input");
      var grid = panel.querySelector(".card-grid");
      var empty = panel.querySelector(".tutorial-search-empty");
      if (!input || !grid) return;

      var query = input.value;
      var cards = grid.querySelectorAll("article.card");
      var visible = 0;

      cards.forEach(function (card) {
        var match = fuzzyMatch(getCardSearchText(card), query);
        card.classList.toggle("tutorial-card-filter-hidden", !match);
        if (match) visible++;
      });

      if (empty) {
        empty.hidden = visible > 0 || !normalizeSearchText(query);
      }
    }

    panels.forEach(function (panel) {
      var input = panel.querySelector(".tutorial-category-search-input");
      if (!input || input.dataset.searchBound === "1") return;
      input.dataset.searchBound = "1";
      input.addEventListener("input", function () {
        filterPanel(panel);
      });
      input.addEventListener("search", function () {
        filterPanel(panel);
      });
    });

    applyTutorialSearchLabels();

    document.addEventListener("openakita:language-changed", function () {
      applyTutorialSearchLabels();
      panels.forEach(filterPanel);
    });
  }

})();
