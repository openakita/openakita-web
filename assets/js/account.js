(function () {
  "use strict";

  const COPY = {
    zh: {
      "hero.eyebrow": "Account Hub",
      "hero.title": "我的 OpenAkita",
      "hero.description": "集中查看账户状态、已获取资源、统一权益与 Pass 摘要；详细管理仍在对应产品中完成。",
      "common.loading": "加载中",
      "common.available": "可用",
      "common.unavailable": "暂不可用",
      "common.retry": "重试",
      "common.moduleUnavailable": "暂时无法加载，稍后重试。",
      "common.requestId": "请求 ID",
      "account.kicker": "Account",
      "account.title": "账户状态",
      "account.verified": "邮箱已验证，账户状态正常。",
      "account.bindingRequired": "邮箱尚未验证，请前往 Account 完成安全设置。",
      "account.action": "前往登录与安全",
      "marketplace.title": "已获取资源",
      "marketplace.acquired": "已获取",
      "marketplace.updates": "待更新",
      "marketplace.emptyTitle": "还没有获取资源",
      "marketplace.emptyDescription": "从官方资源开始，为 OpenAkita 添加新能力。",
      "marketplace.explore": "探索市场",
      "marketplace.recent": "最近获取",
      "marketplace.action": "前往已获取资源",
      "marketplace.acquiredAt": "获取于",
      "entitlements.kicker": "Access",
      "entitlements.title": "统一权益",
      "entitlements.active": "项有效权益",
      "entitlements.emptyTitle": "暂无有效权益",
      "entitlements.emptyDescription": "你获得的产品访问权限会显示在这里。",
      "entitlements.action": "前往权益与 License",
      "entitlements.updated": "更新时间",
      "entitlements.item": "项",
      "pass.title": "API 与余额摘要",
      "pass.balance": "可用余额",
      "pass.usage": "本月用量",
      "pass.emptyTitle": "尚未启用 OpenAkita Pass",
      "pass.emptyDescription": "进入 Pass 控制台后，将使用当前 OpenAkita Account 自动创建业务账户。",
      "pass.console": "前往 Pass 控制台",
      "pass.topup": "充值",
      "pass.active": "Pass 账户状态正常。",
      "pass.suspended": "Pass 账户已暂停，请进入控制台查看详情。",
      "pass.depleted": "可用余额已用尽，请进入 Pass 控制台处理。",
      "pass.lowBalance": "可用余额较低，请留意后续用量。",
      "pass.usageUnavailable": "本月用量暂不可用，余额数据不受影响。",
      "pass.period": "本月请求",
      "global.unavailableTitle": "我的 OpenAkita 暂时无法加载",
      "global.unavailableDescription": "页面框架仍然可用，请稍后重试。",
      "global.disabledTitle": "账户当前不可用",
      "global.disabledDescription": "请前往 Account 查看账户状态，或联系支持。",
      "global.rateLimitedTitle": "请求过于频繁",
      "global.rateLimitedDescription": "请稍候片刻再重试。"
    },
    en: {
      "hero.eyebrow": "Account Hub",
      "hero.title": "My OpenAkita",
      "hero.description": "View your account, acquired resources, entitlements, and Pass summary here. Detailed management stays in the relevant product.",
      "common.loading": "Loading",
      "common.available": "Available",
      "common.unavailable": "Unavailable",
      "common.retry": "Retry",
      "common.moduleUnavailable": "Temporarily unavailable. Please try again later.",
      "common.requestId": "Request ID",
      "account.kicker": "Account",
      "account.title": "Account status",
      "account.verified": "Your email is verified and the account is in good standing.",
      "account.bindingRequired": "Your email is not verified. Complete security setup in Account.",
      "account.action": "Open sign-in and security",
      "marketplace.title": "Acquired resources",
      "marketplace.acquired": "Acquired",
      "marketplace.updates": "Updates",
      "marketplace.emptyTitle": "No acquired resources yet",
      "marketplace.emptyDescription": "Start with official resources and add new capabilities to OpenAkita.",
      "marketplace.explore": "Explore Marketplace",
      "marketplace.recent": "Recently acquired",
      "marketplace.action": "Open acquired resources",
      "marketplace.acquiredAt": "Acquired",
      "entitlements.kicker": "Access",
      "entitlements.title": "Entitlements",
      "entitlements.active": "active entitlements",
      "entitlements.emptyTitle": "No active entitlements",
      "entitlements.emptyDescription": "Product access granted to you will appear here.",
      "entitlements.action": "Open entitlements and License",
      "entitlements.updated": "Updated",
      "entitlements.item": "active",
      "pass.title": "API and balance summary",
      "pass.balance": "Available balance",
      "pass.usage": "Usage this month",
      "pass.emptyTitle": "OpenAkita Pass is not enabled yet",
      "pass.emptyDescription": "Open Pass Console to create the product account with your current OpenAkita Account.",
      "pass.console": "Open Pass Console",
      "pass.topup": "Top up",
      "pass.active": "Your Pass account is active.",
      "pass.suspended": "Your Pass account is suspended. Open the console for details.",
      "pass.depleted": "Your available balance is depleted. Open Pass Console to continue.",
      "pass.lowBalance": "Your available balance is low. Keep an eye on upcoming usage.",
      "pass.usageUnavailable": "Usage for this month is unavailable. Balance data is unaffected.",
      "pass.period": "Requests this month",
      "global.unavailableTitle": "My OpenAkita is temporarily unavailable",
      "global.unavailableDescription": "The page shell is still available. Please try again later.",
      "global.disabledTitle": "This account is unavailable",
      "global.disabledDescription": "Open Account to review its status or contact support.",
      "global.rateLimitedTitle": "Too many requests",
      "global.rateLimitedDescription": "Wait a moment and try again."
    }
  };

  const MODULE_NAMES = ["account", "marketplace", "entitlements", "pass"];
  const root = document.querySelector("[data-hub-root]");
  if (!root) return;

  const moduleContainer = root.querySelector("[data-hub-modules]");
  const globalMessage = root.querySelector("[data-hub-global-message]");
  const globalTitle = root.querySelector("[data-hub-global-title]");
  const globalDescription = root.querySelector("[data-hub-global-description]");
  const requestIdNode = root.querySelector("[data-hub-request-id]");
  const retryAllButton = root.querySelector("[data-hub-retry-all]");
  let latestPayload = null;
  let activeRequest = null;

  function currentLanguage() {
    const language = (document.documentElement.lang || "zh").toLowerCase().split("-")[0];
    return COPY[language] ? language : "en";
  }

  function hubText(key) {
    const language = currentLanguage();
    return COPY[language][key] || COPY.en[key] || COPY.zh[key] || key;
  }

  function applyHubTranslations() {
    document.querySelectorAll("[data-hub-text]").forEach(function (node) {
      const key = node.getAttribute("data-hub-text");
      if (key) node.textContent = hubText(key);
    });
  }

  function safeCount(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }

  function safeText(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safeEmailLabel(value) {
    const label = safeText(value, "");
    const separator = label.lastIndexOf("@");
    if (separator <= 0 || label.includes("*")) return label;
    const local = label.slice(0, separator);
    const domain = label.slice(separator + 1);
    return (Array.from(local)[0] || "*") + "***@" + domain;
  }

  function safeUrl(value, fallback, requiredOrigin) {
    if (typeof value !== "string" || !value) return fallback;
    try {
      const url = new URL(value, window.location.origin);
      const sameOrigin = url.origin === window.location.origin;
      if ((!sameOrigin && url.protocol !== "https:") || url.username || url.password) return fallback;
      if (requiredOrigin && url.origin !== requiredOrigin) return fallback;
      return sameOrigin ? url.pathname + url.search + url.hash : url.href;
    } catch (_) {
      return fallback;
    }
  }

  function safeLoginUrl(value) {
    const fallback = "/auth/login?return_to=%2Faccount";
    const link = safeUrl(value, fallback, window.location.origin);
    try {
      const url = new URL(link, window.location.origin);
      return url.pathname === "/auth/login" ? url.pathname + url.search : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeImageUrl(value) {
    if (typeof value !== "string" || !value) return "";
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function initials(name) {
    const parts = String(name || "OpenAkita").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "OA";
    return parts.slice(0, 2).map(function (part) { return Array.from(part)[0] || ""; }).join("").toUpperCase();
  }

  function formatDate(value) {
    if (typeof value !== "string" || !value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(document.documentElement.lang || "en", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function safeQuota(value) {
    return typeof value === "number" && Number.isSafeInteger(value) ? value : 0;
  }

  function formatQuota(value, display) {
    const quota = safeQuota(value);
    const type = display && ["CNY", "TOKENS", "CUSTOM"].includes(display.type) ? display.type : "TOKENS";
    const quotaPerUnit = display && typeof display.quota_per_unit === "number" && display.quota_per_unit > 0
      ? display.quota_per_unit : 1;
    if (type === "TOKENS") {
      return new Intl.NumberFormat(document.documentElement.lang || "en", { maximumFractionDigits: 0 }).format(quota);
    }
    const exchangeRate = type === "CUSTOM" && display && typeof display.currency_exchange_rate === "number" && display.currency_exchange_rate > 0
      ? display.currency_exchange_rate : 1;
    const amount = quota / quotaPerUnit * exchangeRate;
    const symbol = safeText(display && display.currency_symbol, type === "CNY" ? "CNY " : "").slice(0, 8);
    return symbol + new Intl.NumberFormat(document.documentElement.lang || "en", {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.abs(amount) < 1 ? 4 : 2
    }).format(amount);
  }

  function moduleNode(name) {
    return root.querySelector('[data-hub-module="' + name + '"]');
  }

  function setModuleState(name, state) {
    const card = moduleNode(name);
    if (!card) return;
    const loading = card.querySelector("[data-hub-loading]");
    const content = card.querySelector("[data-hub-content]");
    const error = card.querySelector("[data-hub-error]");
    const status = card.querySelector("[data-hub-status]");
    card.dataset.state = state;
    loading.hidden = state !== "loading";
    content.hidden = state !== "ok";
    error.hidden = state !== "unavailable";
    status.textContent = hubText(state === "loading" ? "common.loading" : state === "ok" ? "common.available" : "common.unavailable");
  }

  function updateLink(key, value, enforceFallbackOrigin) {
    const link = root.querySelector('[data-hub-link="' + key + '"]');
    if (!link) return;
    const fallback = link.getAttribute("href") || "/account";
    let requiredOrigin;
    if (enforceFallbackOrigin) {
      try { requiredOrigin = new URL(fallback, window.location.origin).origin; } catch (_) { requiredOrigin = undefined; }
    }
    link.setAttribute("href", safeUrl(value, fallback, requiredOrigin));
  }

  function renderAccount(data, links) {
    const card = moduleNode("account");
    const displayName = safeText(data && data.display_name, "OpenAkita");
    const emailLabel = safeEmailLabel(data && data.email_label);
    const avatar = card.querySelector("[data-hub-avatar]");
    const avatarFallback = card.querySelector("[data-hub-avatar-fallback]");
    card.querySelector("[data-hub-account-name]").textContent = displayName;
    card.querySelector("[data-hub-account-email]").textContent = emailLabel;
    avatarFallback.textContent = initials(displayName);

    const avatarUrl = safeImageUrl(data && data.avatar_url);
    avatar.hidden = !avatarUrl;
    avatarFallback.hidden = !!avatarUrl;
    if (avatarUrl) avatar.setAttribute("src", avatarUrl);
    else avatar.removeAttribute("src");

    const needsBinding = Boolean(data && data.requires_email_binding) || !(data && data.email_verified === true);
    const emailState = card.querySelector("[data-hub-email-state]");
    emailState.dataset.tone = needsBinding ? "warning" : "normal";
    emailState.textContent = hubText(needsBinding ? "account.bindingRequired" : "account.verified");
    updateLink("account_security", links && links.account_security, false);
    setModuleState("account", "ok");
  }

  function resourceTypeLabel(value) {
    const type = safeText(value, "resource").toLowerCase();
    return ["plugin", "skill", "mcp"].includes(type) ? type.toUpperCase() : "RESOURCE";
  }

  function renderMarketplace(data, links) {
    const card = moduleNode("marketplace");
    const acquired = safeCount(data && data.acquired_count);
    const updates = safeCount(data && data.update_available_count);
    const recent = Array.isArray(data && data.recent) ? data.recent.slice(0, 3) : [];
    card.querySelector("[data-hub-acquired-count]").textContent = String(acquired);
    card.querySelector("[data-hub-update-count]").textContent = String(updates);

    updateLink("marketplace_explore", links && links.marketplace_explore, true);
    updateLink("marketplace_library", links && links.marketplace_library, true);
    const empty = card.querySelector("[data-hub-marketplace-empty]");
    const recentBlock = card.querySelector("[data-hub-marketplace-recent]");
    const libraryAction = card.querySelector('[data-hub-link="marketplace_library"]');
    empty.hidden = acquired !== 0;
    recentBlock.hidden = acquired === 0 || recent.length === 0;
    libraryAction.hidden = acquired === 0;

    const list = card.querySelector("[data-hub-resource-list]");
    list.replaceChildren();
    let marketplaceOrigin;
    try { marketplaceOrigin = new URL(libraryAction.getAttribute("href"), window.location.origin).origin; } catch (_) { marketplaceOrigin = undefined; }
    recent.forEach(function (resource) {
      const item = document.createElement("li");
      item.className = "hub-resource-item";
      const type = resourceTypeLabel(resource && resource.resource_type);
      const iconUrl = safeImageUrl(resource && resource.icon_url);
      const iconFallback = document.createElement("span");
      iconFallback.className = "hub-resource-icon-fallback";
      iconFallback.setAttribute("aria-hidden", "true");
      iconFallback.textContent = type;
      let icon;
      if (iconUrl) {
        icon = document.createElement("img");
        icon.className = "hub-resource-icon";
        icon.src = iconUrl;
        icon.alt = "";
        icon.referrerPolicy = "no-referrer";
        icon.addEventListener("error", function () { icon.replaceWith(iconFallback); }, { once: true });
      } else {
        icon = iconFallback;
      }
      const link = document.createElement("a");
      const fallback = libraryAction.getAttribute("href") || "/account";
      link.href = safeUrl(resource && resource.detail_url, fallback, marketplaceOrigin);
      link.textContent = safeText(resource && resource.name, hubText("marketplace.title"));
      const meta = document.createElement("span");
      meta.className = "hub-resource-meta";
      const acquiredAt = formatDate(resource && resource.acquired_at);
      meta.textContent = acquiredAt ? type + " · " + hubText("marketplace.acquiredAt") + " " + acquiredAt : type;
      link.appendChild(meta);
      item.append(icon, link);
      list.appendChild(item);
    });
    setModuleState("marketplace", "ok");
  }

  function productLabel(value) {
    const raw = safeText(value, "OpenAkita").replace(/[_-]+/g, " ");
    return raw.replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function renderEntitlements(data, links) {
    const card = moduleNode("entitlements");
    const active = safeCount(data && data.active_count);
    const products = Array.isArray(data && data.products) ? data.products.slice(0, 20) : [];
    card.querySelector("[data-hub-entitlement-count]").textContent = String(active);
    card.querySelector("[data-hub-entitlements-empty]").hidden = active !== 0;
    const list = card.querySelector("[data-hub-product-list]");
    list.replaceChildren();
    products.forEach(function (product) {
      const item = document.createElement("li");
      item.className = "hub-product-item";
      const name = document.createElement("span");
      name.textContent = productLabel(product && product.product_code);
      const count = document.createElement("span");
      count.className = "hub-product-count";
      count.textContent = safeCount(product && product.active_count) + " " + hubText("entitlements.item");
      item.append(name, count);
      list.appendChild(item);
    });
    const updatedNode = card.querySelector("[data-hub-updated-at]");
    const updated = formatDate(data && data.updated_at);
    updatedNode.hidden = !updated;
    updatedNode.textContent = updated ? hubText("entitlements.updated") + " · " + updated : "";
    updateLink("account_entitlements", links && links.account_entitlements, false);
    setModuleState("entitlements", "ok");
  }

  function renderPass(data, links) {
    const card = moduleNode("pass");
    const status = safeText(data && data.account_status, "not_provisioned");
    const isProvisioned = status === "active" || status === "suspended";
    const alerts = Array.isArray(data && data.alerts) ? data.alerts.filter(function (value) { return typeof value === "string"; }) : [];
    const metrics = card.querySelector("[data-hub-pass-metrics]");
    const empty = card.querySelector("[data-hub-pass-empty]");
    const state = card.querySelector("[data-hub-pass-state]");
    const topUp = card.querySelector('[data-hub-link="pass_topup"]');
    metrics.hidden = !isProvisioned;
    empty.hidden = isProvisioned;
    topUp.hidden = status !== "active";
    card.querySelector("[data-hub-pass-balance]").textContent = formatQuota(data && data.available_quota, data && data.display);
    const usageAvailable = data && data.usage_available === true;
    card.querySelector("[data-hub-pass-usage]").textContent = usageAvailable
      ? formatQuota(data && data.current_month_used_quota, data && data.display) : "—";

    let stateKey = "pass.active";
    if (status === "suspended" || alerts.includes("account_suspended")) stateKey = "pass.suspended";
	else if (alerts.includes("balance_depleted")) stateKey = "pass.depleted";
	else if (alerts.includes("low_balance")) stateKey = "pass.lowBalance";
	else if (!usageAvailable || alerts.includes("usage_unavailable")) stateKey = "pass.usageUnavailable";
    state.hidden = !isProvisioned;
    state.dataset.tone = stateKey === "pass.active" ? "normal" : "warning";
    state.textContent = hubText(stateKey);

    const period = card.querySelector("[data-hub-pass-period]");
    const requests = safeCount(data && data.current_month_request_count);
    period.hidden = !isProvisioned;
    period.textContent = isProvisioned ? hubText("pass.period") + " · " + new Intl.NumberFormat(document.documentElement.lang || "en").format(requests) : "";
    updateLink("pass_console", links && links.pass_console, false);
    updateLink("pass_topup", links && links.pass_topup, false);
    setModuleState("pass", "ok");
  }

  function renderModule(name, envelope, links) {
    if (!envelope || envelope.status !== "ok" || !envelope.data || typeof envelope.data !== "object") {
      setModuleState(name, "unavailable");
      return;
    }
    if (name === "account") renderAccount(envelope.data, links);
    if (name === "marketplace") renderMarketplace(envelope.data, links);
    if (name === "entitlements") renderEntitlements(envelope.data, links);
    if (name === "pass") renderPass(envelope.data, links);
  }

  function renderPayload(payload) {
    latestPayload = payload;
    moduleContainer.hidden = false;
    globalMessage.hidden = true;
    MODULE_NAMES.forEach(function (name) { renderModule(name, payload[name], payload.links || {}); });
    root.dataset.state = "ready";
    root.setAttribute("aria-busy", "false");
  }

  function showGlobalError(kind, requestId) {
    const prefix = kind === "disabled" ? "global.disabled" : kind === "rateLimited" ? "global.rateLimited" : "global.unavailable";
    globalTitle.textContent = hubText(prefix + "Title");
    globalDescription.textContent = hubText(prefix + "Description");
    requestIdNode.hidden = !requestId;
    requestIdNode.textContent = requestId ? hubText("common.requestId") + ": " + requestId : "";
    retryAllButton.hidden = kind === "disabled";
    globalMessage.hidden = false;
    moduleContainer.hidden = true;
    root.dataset.state = "error";
    root.setAttribute("aria-busy", "false");
  }

  async function loadHub(retryModule) {
    if (activeRequest) return;
    if (retryModule) setModuleState(retryModule, "loading");
    else MODULE_NAMES.forEach(function (name) { setModuleState(name, "loading"); });
    globalMessage.hidden = true;
    moduleContainer.hidden = false;
    root.dataset.state = "loading";
    root.setAttribute("aria-busy", "true");

    const controller = new AbortController();
    const timeout = window.setTimeout(function () { controller.abort(); }, 4000);
    activeRequest = controller;
    try {
      const response = await fetch("/api/v1/hub", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      const requestId = safeText(response.headers.get("X-Request-ID"), "").slice(0, 96);
      const contentType = response.headers.get("content-type") || "";
      const body = contentType.includes("application/json") ? await response.json() : {};
      if (response.status === 401) {
        window.location.assign(safeLoginUrl(body && body.login_url));
        return;
      }
      if (response.status === 403) {
        showGlobalError("disabled", requestId);
        return;
      }
      if (response.status === 429) {
        showGlobalError("rateLimited", requestId);
        return;
      }
      if (!response.ok || !contentType.includes("application/json") || !body || typeof body !== "object") {
        throw new Error("hub_unavailable");
      }
      renderPayload(body);
    } catch (_) {
      showGlobalError("unavailable", "");
    } finally {
      window.clearTimeout(timeout);
      activeRequest = null;
    }
  }

  root.querySelectorAll("[data-hub-retry]").forEach(function (button) {
    button.addEventListener("click", function () { loadHub(button.getAttribute("data-hub-retry")); });
  });
  retryAllButton.addEventListener("click", function () { loadHub(); });
  root.querySelector("[data-hub-avatar]").addEventListener("error", function (event) {
    event.currentTarget.hidden = true;
    event.currentTarget.removeAttribute("src");
    root.querySelector("[data-hub-avatar-fallback]").hidden = false;
  });
  document.addEventListener("openakita:language-changed", function () {
    applyHubTranslations();
    if (latestPayload) renderPayload(latestPayload);
  });

  applyHubTranslations();
  loadHub();
})();
