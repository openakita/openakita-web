(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const transport = window.OpenAkitaChatProvider;
  const providers = transport.providers;
  const copy = window.OpenAkitaChatI18n.messages;
  const languageFromPage = () => window.OpenAkitaChatI18n.language();
  let language = languageFromPage();
  const t = (key, values) => window.OpenAkitaChatI18n.t(key, values);
  const errorText = (code) => copy[language].errors[code] || copy[language].errors.network_error;
  const storageKey = "openakita_web_chat_v1";
  const keys = new Map();
  let endpoints = [], conversations = [], activeID = null, editingID = null, controller = null, modelsController = null;
  let enabled = false, storageFailed = false;
  let pendingDeleteID = null, actionStatusKey = "", actionStatusTimer;
  let defaultEndpointName = "";
  let preferredEndpointID = "";
  const node = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
  const activeChat = () => conversations.find((chat) => chat.id === activeID);
  const uid = () => crypto.randomUUID();
  function activity(key, compact = false) {
    const indicator = node("div", "chat-activity" + (compact ? " compact" : ""));
    indicator.title = t(key);
    const visual = node("span", "chat-activity-visual"); visual.setAttribute("aria-hidden", "true");
    const dots = node("span", "chat-activity-dots");
    for (let i = 0; i < 3; i++) dots.append(node("span"));
    visual.append(dots); indicator.append(visual, node("span", "visually-hidden", t(key)));
    return indicator;
  }
  function setStatus(id, key = "", isError = false) {
    const el = $(id);
    const generating = id === "chat-status" && !isError && ["sending", "receiving"].includes(key);
    if (generating && el.dataset.chatActivity === key) return;
    delete el.dataset.chatText; delete el.dataset.chatError; delete el.dataset.chatActivity;
    if (generating) { el.dataset.chatActivity = key; el.replaceChildren(activity(key, true)); return; }
    if (key) el.dataset[isError ? "chatError" : "chatText"] = key;
    el.textContent = key ? (isError ? errorText(key) : t(key)) : "";
  }
  function restore() {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!data || data.version !== 1) return;
      if (typeof data.activeEndpointID === "string") preferredEndpointID = data.activeEndpointID;
      if (Array.isArray(data.endpoints)) endpoints = data.endpoints.slice(0, 30).filter((e) => e && typeof e.id === "string" && Object.hasOwn(providers, e.provider) && typeof e.name === "string" && typeof e.model === "string").map((e) => {
        const rememberKey = e.rememberKey !== false;
        if (rememberKey && typeof e.apiKey === "string" && e.apiKey.trim() && e.apiKey.length <= 4096 && !/[\r\n\0]/.test(e.apiKey)) keys.set(e.id, e.apiKey.trim());
        return { id: e.id, provider: e.provider, name: e.name.slice(0, 60), model: e.model.slice(0, 200), rememberKey };
      });
      if (Array.isArray(data.conversations)) conversations = data.conversations.slice(0, 40).filter((c) => c && typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.messages)).map((c) => ({ id: c.id, title: c.title.slice(0, 80), endpointID: typeof c.endpointID === "string" ? c.endpointID : "", messages: c.messages.slice(-100).filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").map((m) => ({ role: m.role, content: m.content.slice(0, 100000), model: typeof m.model === "string" ? m.model.slice(0, 200) : "", status: ["done", "stopped", "failed"].includes(m.status) ? m.status : "failed" })) }));
    } catch (_) { /* Corrupt or blocked storage must not prevent chat. */ }
  }
  function persist() {
    try {
      // Persist keys only for connections with the device-memory option enabled.
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, activeEndpointID: preferredEndpointID, endpoints: endpoints.map(({ id, provider, name, model, rememberKey }) => ({ id, provider, name, model, rememberKey, ...(rememberKey && keys.has(id) ? { apiKey: keys.get(id) } : {}) })), conversations }));
      storageFailed = false;
    } catch (_) { storageFailed = true; setStatus("chat-status", "storageError"); }
  }
  function localize() {
    document.querySelectorAll("[data-chat-text]").forEach((el) => { el.textContent = t(el.dataset.chatText); });
    document.querySelectorAll("[data-chat-error]").forEach((el) => { el.textContent = errorText(el.dataset.chatError); });
    document.querySelectorAll("[data-chat-activity]").forEach((el) => { el.replaceChildren(activity(el.dataset.chatActivity, true)); });
    $("chat-input").placeholder = t("messagePlaceholder");
    $("chat-input").setAttribute("aria-label", t("messagePlaceholder"));
    $("search-chats").placeholder = t("search");
    $("endpoint-model").placeholder = t("modelPlaceholder");
    $("endpoint-key").placeholder = t("keyPlaceholder");
    const connectionName = t("connectionName", { provider: providers[$("endpoint-provider").value].name });
    $("endpoint-name").placeholder = connectionName;
    if (!editingID && $("endpoint-name").value === defaultEndpointName) $("endpoint-name").value = connectionName;
    defaultEndpointName = connectionName;
    $("endpoint-form-title").textContent = t(editingID ? "editEndpoint" : "addEndpoint");
    for (const [id, key] of [["send-message", "sendLabel"], ["close-endpoints", "closeLabel"], ["open-sidebar", "sidebarLabel"], ["close-sidebar", "closeSidebar"], ["chat-sidebar", "conversationsLabel"], ["messages", "messagesLabel"], ["endpoint-dialog-content", "endpointSettings"]]) $(id).setAttribute("aria-label", t(key));
    document.querySelector(".chat-panel").setAttribute("aria-label", t("chatLabel"));
    document.querySelector(".chat-topbar-sub").title = t("subtitle");
    document.title = t("title");
    if (actionStatusKey) $("chat-action-status").textContent = t(actionStatusKey);
    render();
    window.OpenAkitaChatControls?.refresh();
  }
  function renderSidebar() {
    const list = $("conversations"); list.replaceChildren();
    const query = $("search-chats").value.trim().toLowerCase();
    const matches = conversations.filter((chat) => !query || chat.title.toLowerCase().includes(query) || chat.messages.some((m) => m.content.toLowerCase().includes(query)));
    if (!matches.length) list.append(node("p", "chat-empty-list", t(query ? "noResults" : "noChats")));
    matches.forEach((chat) => {
      const row = node("div", "chat-conversation-row" + (chat.id === activeID ? " active" : ""));
      row.dataset.conversationId = chat.id;
      const button = node("button", "chat-conversation", chat.title);
      button.type = "button"; button.disabled = !!controller; button.setAttribute("aria-pressed", String(chat.id === activeID));
      button.title = chat.title;
      button.addEventListener("click", () => { activeID = chat.id; $("chat-sidebar").classList.remove("open"); setStatus("chat-status"); render(); });
      const actions = node("div", "chat-conversation-actions");
      for (const [label, handler] of [["exportLabel", exportConversation], ["deleteLabel", requestDeleteConversation]]) {
        const action = window.OpenAkitaChatActions.createButton(label);
        action.setAttribute("aria-label", t(label) + " · " + chat.title);
        action.disabled = !!controller;
        if (controller) action.title = t("generatingActions");
        action.addEventListener("click", () => handler(chat.id)); actions.append(action);
      }
      row.append(button, actions); list.append(row);
    });
  }
  function renderEndpointPicker() {
    const select = $("active-endpoint");
    const previous = activeChat()?.endpointID || select.value || preferredEndpointID;
    select.replaceChildren();
    if (!endpoints.length) select.append(new Option(t("connect"), ""));
    endpoints.forEach((e) => select.append(new Option(e.name + " · " + e.model + (keys.has(e.id) ? "" : " · " + t("keyMissing")), e.id)));
    if (endpoints.some((e) => e.id === previous)) select.value = previous;
    preferredEndpointID = select.value;
    if (activeChat()) activeChat().endpointID = select.value;
    $("endpoint-count").textContent = String(endpoints.length);
    $("welcome-connect").textContent = t(endpoints.length ? "endpoints" : "connect");
    window.OpenAkitaChatControls?.refresh();
  }
  function renderContent(target, text, streaming) {
    window.OpenAkitaChatMarkdown.render(target, text, { streaming });
  }
  function renderMessages() {
    const chat = activeChat(); const container = $("messages"); container.replaceChildren();
    $("chat-welcome").hidden = !!chat?.messages.length;
    (chat?.messages || []).forEach((message, index) => {
      const row = node("article", "chat-message " + message.role);
      row.append(node("div", "chat-message-avatar", message.role === "user" ? t("you") : "OA"));
      const body = node("div", "chat-message-body");
      const label = node("div", "chat-message-label", message.role === "user" ? t("you") : message.model || t("assistant"));
      if (message.status === "pending" && message.content) {
        const wave = node("span", "chat-stream-indicator"); wave.setAttribute("aria-hidden", "true");
        wave.style.setProperty("--chat-stream-phase", -(performance.now() % 1400) / 1000 + "s");
        for (let i = 0; i < 3; i++) wave.append(node("span"));
        label.append(wave);
      }
      body.append(label);
      const content = node("div", "chat-message-content");
      if (message.status === "pending" && !message.content) content.append(activity("pending"));
      else renderContent(content, message.content, message.status === "pending");
      body.append(content);
      if (["failed", "stopped"].includes(message.status)) body.append(node("div", "chat-message-note", t(message.status === "stopped" ? "stopped" : "interrupted")));
      const actions = node("div", "chat-message-actions");
      if (message.content) {
        const button = window.OpenAkitaChatActions.createButton("copy");
        button.addEventListener("click", async () => { try { await navigator.clipboard.writeText(message.content); window.OpenAkitaChatActions.setState(button, "copied"); } catch (_) { window.OpenAkitaChatActions.setState(button, "failedCopy"); setStatus("chat-status", "failedCopy"); } }); actions.append(button);
      }
      if (message.role === "assistant" && index === chat.messages.length - 1 && !controller) {
        const retry = window.OpenAkitaChatActions.createButton("retry");
        retry.addEventListener("click", () => send(true)); actions.append(retry);
      }
      body.append(actions); row.append(body); container.append(row);
    });
    container.setAttribute("aria-busy", String(!!controller));
  }
  function render() {
    renderSidebar(); renderEndpointPicker(); renderMessages();
    for (const id of ["new-chat", "active-endpoint", "manage-endpoints"]) $(id).disabled = !!controller;
    $("send-message").hidden = !!controller; $("stop-message").hidden = !controller;
    $("chat-input").disabled = !!controller; $("send-message").disabled = !enabled;
  }
  function showActionStatus(key) {
    clearTimeout(actionStatusTimer); actionStatusKey = key;
    $("chat-action-status").textContent = t(key); $("chat-action-status").hidden = false;
    actionStatusTimer = setTimeout(() => { actionStatusKey = ""; $("chat-action-status").hidden = true; }, 6000);
  }
  function exportConversation(id) {
    if (controller) return;
    const chat = conversations.find((item) => item.id === id);
    if (!chat?.messages.length) { showActionStatus("noConversation"); return; }
    let url, link;
    try {
      const text = "# " + chat.title + "\n\n" + chat.messages.map((m) => "## " + (m.role === "user" ? t("you") : m.model || t("assistant")) + "\n\n" + m.content).join("\n\n");
      url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
      link = node("a"); link.href = url;
      const filename = chat.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(0, 60).replace(/[. ]+$/g, "") || "conversation";
      link.download = "openakita-" + filename + ".md"; link.hidden = true;
      document.body.append(link); link.click(); showActionStatus("exported");
    } catch (_) { showActionStatus("exportFailed"); }
    finally { link?.remove(); if (url) setTimeout(() => URL.revokeObjectURL(url), 10000); }
  }
  function requestDeleteConversation(id) {
    if (controller) return;
    const chat = conversations.find((item) => item.id === id);
    if (!chat?.messages.length) { showActionStatus("noConversation"); return; }
    pendingDeleteID = chat.id; $("delete-conversation-name").textContent = chat.title;
    $("delete-chat-dialog").showModal();
  }
  function renderEndpointList() {
    const list = $("endpoint-list"); list.replaceChildren();
    if (!endpoints.length) list.append(node("p", "chat-empty-list", t("noEndpoints")));
    endpoints.forEach((endpoint) => {
      const row = node("div", "chat-endpoint-row"); const info = node("div");
      info.append(node("strong", "", endpoint.name)); info.append(node("small", "", providers[endpoint.provider].name + " · " + endpoint.model + " · " + t(keys.has(endpoint.id) ? "keyReady" : "keyMissing"))); row.append(info);
      const edit = node("button", "", t("edit")); edit.type = "button"; edit.addEventListener("click", () => editEndpoint(endpoint));
      const remove = node("button", "", t("remove")); remove.type = "button"; remove.addEventListener("click", () => removeEndpoint(endpoint));
      row.append(edit, remove); list.append(row);
    });
  }
  function removeEndpoint(endpoint) {
    if (!window.confirm(t("confirmEndpoint"))) return;
    keys.delete(endpoint.id); endpoints = endpoints.filter((e) => e.id !== endpoint.id);
    resetEndpoint(); persist(); render(); renderEndpointList();
  }
  function providerChanged() {
    if (modelsController) modelsController.abort();
    const provider = providers[$("endpoint-provider").value];
    $("endpoint-url").value = provider.url; $("provider-key-link").href = provider.keys;
    $("provider-models").replaceChildren(); setStatus("endpoint-status");
    window.OpenAkitaChatControls?.refresh();
  }
  function resetEndpoint() {
    editingID = null; $("endpoint-form").reset(); providerChanged();
    defaultEndpointName = $("endpoint-name").value = t("connectionName", { provider: providers[$("endpoint-provider").value].name });
    $("endpoint-form-title").textContent = t("addEndpoint");
    window.OpenAkitaChatControls?.refresh();
  }
  function editEndpoint(endpoint) {
    editingID = endpoint.id; $("endpoint-provider").value = endpoint.provider; providerChanged();
    $("endpoint-name").value = endpoint.name; $("endpoint-key").value = keys.get(endpoint.id) || ""; $("endpoint-model").value = endpoint.model;
    $("endpoint-remember-key").checked = endpoint.rememberKey;
    $("endpoint-form-title").textContent = t("editEndpoint"); $("endpoint-key").focus();
    window.OpenAkitaChatControls?.refresh();
  }
  function openEndpoints(endpoint) { resetEndpoint(); renderEndpointList(); if (endpoint) editEndpoint(endpoint); $("endpoint-dialog").showModal(); }
  async function send(retry) {
    if (controller || !enabled) return;
    let chat = activeChat();
    const endpoint = endpoints.find((e) => e.id === $("active-endpoint").value);
    if (!endpoint || !keys.has(endpoint.id)) { openEndpoints(endpoint); return; }
    const text = retry ? chat?.messages.at(-2)?.content : $("chat-input").value.trim();
    if (!text) return;
    if (!chat) { chat = { id: uid(), title: text.slice(0, 60), endpointID: endpoint.id, messages: [] }; conversations.unshift(chat); conversations = conversations.slice(0, 40); activeID = chat.id; }
    if (retry) chat.messages.splice(-2);
    const history = [];
    for (let i = 0; i < chat.messages.length - 1; i++) {
      const user = chat.messages[i], assistant = chat.messages[i + 1];
      if (user.role === "user" && assistant.role === "assistant" && assistant.content && ["done", "stopped"].includes(assistant.status)) { history.push({ role: "user", content: user.content }, { role: "assistant", content: assistant.content }); i++; }
    }
    const messages = history.slice(-98).concat({ role: "user", content: text });
    chat.endpointID = endpoint.id; chat.messages.push({ role: "user", content: text, status: "done" });
    const answer = { role: "assistant", content: "", model: endpoint.model, status: "pending" }; chat.messages.push(answer);
    if (chat.messages.length > 100) chat.messages = chat.messages.slice(-100);
    controller = new AbortController(); $("chat-input").value = ""; setStatus("chat-status", "sending"); persist(); render();
    let renderTimer;
    try {
      await transport.streamCompletion({ provider: endpoint.provider, key: keys.get(endpoint.id), model: endpoint.model, messages }, (text) => {
        answer.content += text; setStatus("chat-status", "receiving");
        if (renderTimer) return;
        renderTimer = setTimeout(() => {
          renderTimer = null;
          const scroll = $("chat-scroll"); const atBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 100;
          renderMessages(); if (atBottom) scroll.scrollTop = scroll.scrollHeight;
        }, 50);
      }, controller.signal);
      answer.status = "done"; setStatus("chat-status");
    } catch (error) {
      answer.status = error.name === "AbortError" ? "stopped" : "failed";
      setStatus("chat-status", error.name === "AbortError" ? "stopped" : error.message, error.name !== "AbortError");
    } finally {
      clearTimeout(renderTimer);
      controller = null; persist(); render(); $("chat-input").focus();
      if (storageFailed) setStatus("chat-status", "storageError");
    }
  }
  function setup() {
    restore(); resetEndpoint(); localize();
    document.addEventListener("openakita:language-changed", () => { language = languageFromPage(); localize(); renderEndpointList(); });
    $("new-chat").addEventListener("click", () => { activeID = null; $("chat-input").value = ""; setStatus("chat-status"); $("chat-sidebar").classList.remove("open"); render(); $("chat-input").focus(); });
    $("search-chats").addEventListener("input", renderSidebar);
    $("manage-endpoints").addEventListener("click", () => openEndpoints());
    $("welcome-connect").addEventListener("click", () => openEndpoints());
    $("close-endpoints").addEventListener("click", () => $("endpoint-dialog").close());
    $("endpoint-dialog").addEventListener("close", () => { if (modelsController) modelsController.abort(); $("endpoint-key").value = ""; });
    $("reset-endpoint").addEventListener("click", resetEndpoint);
    $("endpoint-provider").addEventListener("change", () => { providerChanged(); $("endpoint-key").value = ""; $("endpoint-model").value = ""; defaultEndpointName = $("endpoint-name").value = t("connectionName", { provider: providers[$("endpoint-provider").value].name }); });
    $("endpoint-form").addEventListener("submit", (event) => {
      event.preventDefault(); const key = $("endpoint-key").value.trim(), model = $("endpoint-model").value.trim(), name = $("endpoint-name").value.trim();
      if (!key || !model || !name) { setStatus("endpoint-status", "invalid_endpoint", true); return; }
      if (!editingID && endpoints.length >= 30) { setStatus("endpoint-status", "invalid_endpoint", true); return; }
      const id = editingID || uid(); const endpoint = { id, provider: $("endpoint-provider").value, name, model, rememberKey: $("endpoint-remember-key").checked };
      if (editingID) endpoints = endpoints.map((e) => e.id === id ? endpoint : e); else endpoints.push(endpoint);
      keys.set(id, key); if (activeChat()) activeChat().endpointID = id;
      render(); $("active-endpoint").value = id; preferredEndpointID = id; persist(); $("endpoint-dialog").close(); $("chat-input").focus();
      window.OpenAkitaChatControls?.refresh();
    });
    $("load-models").addEventListener("click", async () => {
      const key = $("endpoint-key").value.trim(); if (!key) { $("endpoint-key").reportValidity(); return; }
      if (modelsController) modelsController.abort();
      const current = new AbortController(); modelsController = current; const provider = $("endpoint-provider").value;
      $("load-models").disabled = true; setStatus("endpoint-status", "loadingModels");
      try {
        const models = await transport.listModels(provider, key, current.signal);
        if (provider !== $("endpoint-provider").value || current.signal.aborted) return;
        $("provider-models").replaceChildren();
        models.forEach((model) => { const option = document.createElement("option"); option.value = model; $("provider-models").append(option); });
        setStatus("endpoint-status", models.length ? "modelsLoaded" : "noModels");
        window.OpenAkitaChatControls?.refresh();
        if (models.length) { $("endpoint-model").focus(); window.OpenAkitaChatControls?.show("endpoint-model"); }
      } catch (error) { if (error.name !== "AbortError") setStatus("endpoint-status", error.message, true); }
      finally { if (modelsController === current) { modelsController = null; $("load-models").disabled = false; } }
    });
    $("active-endpoint").addEventListener("change", () => { preferredEndpointID = $("active-endpoint").value; if (activeChat()) activeChat().endpointID = preferredEndpointID; persist(); });
    $("composer").addEventListener("submit", (event) => { event.preventDefault(); send(false); });
    $("chat-input").addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey && !event.isComposing) { event.preventDefault(); send(false); } });
    $("stop-message").addEventListener("click", () => controller?.abort());
    $("cancel-delete-chat").addEventListener("click", () => $("delete-chat-dialog").close());
    $("delete-chat-dialog").addEventListener("close", () => { pendingDeleteID = null; });
    $("confirm-delete-chat").addEventListener("click", () => {
      if (controller || !pendingDeleteID) return;
      conversations = conversations.filter((chat) => chat.id !== pendingDeleteID);
      if (activeID === pendingDeleteID) { activeID = null; $("chat-input").value = ""; setStatus("chat-status"); }
      persist(); render(); $("delete-chat-dialog").close(); showActionStatus("deleted");
      ($("conversations").querySelector(".chat-conversation") || $("new-chat")).focus();
    });
    $("open-sidebar").addEventListener("click", () => $("chat-sidebar").classList.add("open"));
    $("close-sidebar").addEventListener("click", () => $("chat-sidebar").classList.remove("open"));
    document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => { $("chat-input").value = t(button.dataset.prompt + "Prompt"); $("chat-input").focus(); }));
    window.addEventListener("beforeunload", (event) => { if (controller) { event.preventDefault(); event.returnValue = ""; } });
  }
  function init() {
    const allowed = transport.isAllowedHost(location.hostname);
    if (!allowed) {
      $("chat-gate").replaceChildren(node("p", "", t("unavailable")));
      const link = node("a", "", t("goAI")); link.href = "https://openakita.ai/chat/"; $("chat-gate").append(link); return;
    }
    enabled = true; setup(); $("chat-gate").hidden = true; $("web-chat").hidden = false;
  }
  init();
})();
