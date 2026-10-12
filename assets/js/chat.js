(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const providers = {
    openai: { name: "OpenAI", url: "https://api.openai.com/v1", keys: "https://platform.openai.com/api-keys" },
    anthropic: { name: "Claude", url: "https://api.anthropic.com/v1", keys: "https://console.anthropic.com/settings/keys" },
    xai: { name: "Grok", url: "https://api.x.ai/v1", keys: "https://console.x.ai/" },
  };
  const copy = {
    en: {
      home: "Home",
      noConversation: "Start a conversation or select one from the sidebar first.", exported: "Conversation exported as Markdown.", exportFailed: "Could not export this conversation. Please try again.", deleted: "Conversation deleted.", deleteTitle: "Delete conversation?", deleteNote: "This conversation will be removed from this browser. This cannot be undone.", cancel: "Cancel", confirmRemove: "Delete", generatingActions: "Wait for the response to finish, or stop generating first.",
      workspace: "YOUR WORKSPACE", newChat: "New conversation", search: "Search conversations", recent: "Recent conversations", endpoints: "LLM endpoints", local: "History stays in this browser", webChat: "Web Chat", subtitle: "A conversation, a little clarity.", eyebrow: "OPENAKITA · IN YOUR BROWSER", welcome: "What's on your mind?", intro: "A space to think, write and explore. Connect your favorite model and make yourself at home.", connect: "Connect an LLM endpoint", explainTitle: "Make it simple", explainDesc: "Understand something new", writeTitle: "Find the right words", writeDesc: "Give your ideas a voice", brainstormTitle: "Think together", brainstormDesc: "Explore a fresh perspective", selectEndpoint: "Select LLM endpoint", shortcut: "Enter to send · Shift+Enter for a new line", stop: "Stop", disclosure: "Your API key and conversation are relayed securely to your selected provider. Provider usage fees apply. AI can make mistakes.", settings: "YOUR CONNECTIONS", endpointIntro: "Bring your own API key. Add one or more connections and switch models whenever you like.", addEndpoint: "Add an endpoint", provider: "Provider", name: "Connection name", baseURL: "API base URL", apiKey: "API key", model: "Model ID", loadModels: "Load models", keyNote: "Keys stay in memory for this tab and are never saved by OpenAkita. After a refresh, enter your key again. Your model must support text chat.", getKey: "Get an API key from your provider ↗", reset: "New endpoint", save: "Save endpoint", editEndpoint: "Edit endpoint", edit: "Edit", remove: "Remove", keyReady: "Key ready for this tab", keyMissing: "Enter your API key", noEndpoints: "No endpoints yet. Add your first connection below.", noChats: "Your conversations will appear here.", noResults: "No conversations found.", messagePlaceholder: "Message your model…", modelPlaceholder: "Enter a model ID or load models", keyPlaceholder: "Paste your provider API key", you: "You", assistant: "Assistant", copy: "Copy", copied: "Copied", retry: "Try again", stopped: "Generation stopped", interrupted: "Response interrupted", connecting: "Connecting to Web Chat…", unavailable: "Web Chat is available on openakita.ai. Visit the international site to start a conversation.", unavailableServer: "Web Chat could not connect. Please try refreshing the page.", goAI: "Open Web Chat on openakita.ai", sending: "Waiting for your model…", receiving: "Generating a response…", ready: "Response complete", storageError: "Browser storage is full or unavailable. This conversation may not survive a refresh. Export it to keep a copy.", confirmDelete: "Delete this conversation from this browser?", confirmEndpoint: "Remove this endpoint? Conversation history will be kept.", sendLabel: "Send message", exportLabel: "Export conversation", deleteLabel: "Delete conversation", closeLabel: "Close endpoints", sidebarLabel: "Open conversations", closeSidebar: "Close sidebar", loadingModels: "Loading models…", modelsLoaded: "Models loaded. Choose a text chat model or enter its ID.", noModels: "No model IDs were returned. Enter a model ID manually.", saved: "Endpoint saved", failedCopy: "Copy failed. Select the text to copy it manually.", pending: "Generating…", title: "Web Chat — OpenAkita",
      explainPrompt: "Explain a complex topic in simple terms. Let’s start with how large language models work.", writePrompt: "Help me write a thoughtful email. Ask me who it is for and what I want to say.", brainstormPrompt: "Let’s brainstorm ideas for a creative project. Ask me about my interests first.",
      errors: { provider_auth_failed: "Your provider rejected the API key. Check its validity and permissions.", provider_rate_limited: "Your provider’s usage limit was reached. Check your quota or try again later.", provider_request_rejected: "The provider rejected this request. Check the model ID, text chat support and account access.", provider_unavailable: "Could not reach your provider. Please try again shortly.", invalid_provider_response: "The provider returned an unexpected response. Please try again.", stream_interrupted: "The connection ended before the response completed. You can try again.", rate_limited: "Too many requests. Please wait a minute and try again.", temporarily_unavailable: "Web Chat is temporarily unavailable. Please try again shortly.", chat_unavailable: "Web Chat is available only on openakita.ai.", invalid_origin: "This request was blocked. Open Web Chat directly on openakita.ai.", conversation_too_large: "This conversation is too large to send. Start a new conversation.", invalid_conversation: "This conversation could not be sent. Start a new conversation.", empty_response: "The model returned no text. Try another text chat model.", network_error: "The connection failed. Check your network and try again.", invalid_request: "The request could not be sent. Start a new conversation.", invalid_endpoint: "Check the provider, model ID and API key.", json_required: "The request format was rejected. Please refresh the page." },
    },
    zh: {
      home: "返回首页",
      noConversation: "请先开始对话，或从侧栏选择已有对话。", exported: "对话已导出为 Markdown 文件。", exportFailed: "导出失败，请重试。", deleted: "对话已删除。", deleteTitle: "删除这段对话？", deleteNote: "这段对话将从当前浏览器中删除，删除后无法恢复。", cancel: "取消", confirmRemove: "删除", generatingActions: "请等待回答完成，或先停止生成。",
      workspace: "我的工作区", newChat: "新建对话", search: "搜索对话", recent: "最近的对话", endpoints: "LLM 端点", local: "聊天记录保存在当前浏览器", webChat: "网页对话", subtitle: "聊一聊，让思路更清晰。", eyebrow: "OPENAKITA · 浏览器中直接使用", welcome: "今天想聊些什么？", intro: "一起思考、写作、探索。连接你喜欢的模型，随时开始对话。", connect: "连接 LLM 端点", explainTitle: "把复杂变简单", explainDesc: "理解一个新知识", writeTitle: "找到合适的表达", writeDesc: "让想法成为文字", brainstormTitle: "一起想一想", brainstormDesc: "探索不同的视角", selectEndpoint: "选择 LLM 端点", shortcut: "Enter 发送 · Shift+Enter 换行", stop: "停止", disclosure: "你的 API Key 和对话会通过安全连接转发给所选供应商。供应商可能收取使用费用，AI 的回答可能有误。", settings: "我的连接", endpointIntro: "使用你自己的 API Key，添加多个连接，随时切换模型。", addEndpoint: "添加端点", provider: "供应商", name: "连接名称", baseURL: "API 地址", apiKey: "API Key", model: "模型 ID", loadModels: "加载模型", keyNote: "密钥仅保留在当前标签页内存中，OpenAkita 不保存密钥。刷新后需要重新填写。请选择支持文本聊天的模型。", getKey: "前往供应商获取 API Key ↗", reset: "新建端点", save: "保存端点", editEndpoint: "编辑端点", edit: "编辑", remove: "删除", keyReady: "当前标签页已填写密钥", keyMissing: "请填写 API Key", noEndpoints: "还没有端点，在下方添加第一个连接。", noChats: "对话将显示在这里。", noResults: "没有找到相关对话。", messagePlaceholder: "发送消息给模型…", modelPlaceholder: "填写模型 ID，或加载模型列表", keyPlaceholder: "粘贴供应商的 API Key", you: "你", assistant: "助手", copy: "复制", copied: "已复制", retry: "重试", stopped: "已停止生成", interrupted: "回答中断", connecting: "正在连接网页对话…", unavailable: "网页对话仅在 openakita.ai 国际站开放。请访问国际站开始对话。", unavailableServer: "无法连接网页对话，请刷新后重试。", goAI: "前往 openakita.ai 网页对话", sending: "正在等待模型响应…", receiving: "正在生成回答…", ready: "回答已完成", storageError: "浏览器存储空间不足或不可用，刷新后可能丢失对话。请导出对话以保留副本。", confirmDelete: "从当前浏览器删除这段对话？", confirmEndpoint: "删除这个端点？已有聊天记录将保留。", sendLabel: "发送消息", exportLabel: "导出对话", deleteLabel: "删除对话", closeLabel: "关闭端点设置", sidebarLabel: "打开对话列表", closeSidebar: "关闭对话列表", loadingModels: "正在加载模型…", modelsLoaded: "已加载模型，请选择支持文本聊天的模型或手动填写 ID。", noModels: "供应商没有返回模型 ID，请手动填写。", saved: "端点已保存", failedCopy: "复制失败，请手动选择文字复制。", pending: "正在生成…", title: "网页对话 — OpenAkita",
      explainPrompt: "用简单的语言解释一个复杂的话题。我们从大语言模型的工作原理开始吧。", writePrompt: "帮我写一封得体的邮件。先问我收件人是谁，以及想表达什么。", brainstormPrompt: "一起为一个创意项目想些点子吧。先问问我的兴趣。",
      errors: { provider_auth_failed: "供应商拒绝了这个 API Key，请检查密钥和权限。", provider_rate_limited: "供应商用量已达上限，请检查额度或稍后重试。", provider_request_rejected: "供应商拒绝了请求，请检查模型 ID、文本聊天支持和账户权限。", provider_unavailable: "暂时无法连接供应商，请稍后重试。", invalid_provider_response: "供应商返回了异常数据，请重试。", stream_interrupted: "回答完成前连接已断开，可以重试。", rate_limited: "请求过于频繁，请等待一分钟后重试。", temporarily_unavailable: "网页对话暂时不可用，请稍后重试。", chat_unavailable: "网页对话仅在 openakita.ai 开放。", invalid_origin: "请求被阻止，请直接访问 openakita.ai 的聊天页面。", conversation_too_large: "对话过长，请新建对话后继续。", invalid_conversation: "无法发送当前对话，请新建对话。", empty_response: "模型没有返回文本，请尝试其他文本聊天模型。", network_error: "连接失败，请检查网络后重试。", invalid_request: "无法发送请求，请新建对话后重试。", invalid_endpoint: "请检查供应商、模型 ID 和 API Key。", json_required: "请求格式异常，请刷新页面。" },
    },
  };
  let language = document.documentElement.lang.startsWith("zh") ? "zh" : "en";
  const t = (key) => copy[language][key] || copy.en[key] || key;
  const errorText = (code) => copy[language].errors[code] || copy[language].errors.network_error;
  const storageKey = "openakita_web_chat_v1";
  const keys = new Map();
  let endpoints = [], conversations = [], activeID = null, editingID = null, controller = null, modelsController = null;
  let enabled = false, storageFailed = false;
  let pendingDeleteID = null, actionStatusKey = "", actionStatusTimer;
  const node = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
  const activeChat = () => conversations.find((chat) => chat.id === activeID);
  const uid = () => crypto.randomUUID();
  function restore() {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!data || data.version !== 1) return;
      if (Array.isArray(data.endpoints)) endpoints = data.endpoints.slice(0, 30).filter((e) => e && typeof e.id === "string" && providers[e.provider] && typeof e.name === "string" && typeof e.model === "string").map((e) => ({ id: e.id, provider: e.provider, name: e.name.slice(0, 60), model: e.model.slice(0, 200) }));
      if (Array.isArray(data.conversations)) conversations = data.conversations.slice(0, 40).filter((c) => c && typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.messages)).map((c) => ({ id: c.id, title: c.title.slice(0, 80), endpointID: typeof c.endpointID === "string" ? c.endpointID : "", messages: c.messages.slice(-100).filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").map((m) => ({ role: m.role, content: m.content.slice(0, 100000), model: typeof m.model === "string" ? m.model.slice(0, 200) : "", status: ["done", "stopped", "failed"].includes(m.status) ? m.status : "failed" })) }));
    } catch (_) { /* Corrupt or blocked storage must not prevent chat. */ }
  }
  function persist() {
    try {
      // Explicitly serialize metadata only; API keys never enter storage.
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, endpoints: endpoints.map(({ id, provider, name, model }) => ({ id, provider, name, model })), conversations }));
    } catch (_) { storageFailed = true; $("chat-status").textContent = t("storageError"); }
  }
  function localize() {
    document.querySelectorAll("[data-chat-text]").forEach((el) => { el.textContent = t(el.dataset.chatText); });
    $("chat-input").placeholder = t("messagePlaceholder");
    $("chat-input").setAttribute("aria-label", t("messagePlaceholder"));
    $("search-chats").placeholder = t("search");
    $("endpoint-model").placeholder = t("modelPlaceholder");
    $("endpoint-key").placeholder = t("keyPlaceholder");
    for (const [id, key] of [["send-message", "sendLabel"], ["export-chat", "exportLabel"], ["delete-chat", "deleteLabel"], ["close-endpoints", "closeLabel"], ["open-sidebar", "sidebarLabel"], ["close-sidebar", "closeSidebar"]]) $(id).setAttribute("aria-label", t(key));
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
      const button = node("button", "chat-conversation" + (chat.id === activeID ? " active" : ""), chat.title);
      button.type = "button"; button.disabled = !!controller; button.setAttribute("aria-pressed", String(chat.id === activeID));
      button.addEventListener("click", () => { activeID = chat.id; $("chat-sidebar").classList.remove("open"); $("chat-status").textContent = ""; render(); });
      list.append(button);
    });
  }
  function renderEndpointPicker() {
    const select = $("active-endpoint");
    const previous = activeChat()?.endpointID || select.value;
    select.replaceChildren();
    if (!endpoints.length) select.append(new Option(t("connect"), ""));
    endpoints.forEach((e) => select.append(new Option(e.name + " · " + e.model + (keys.has(e.id) ? "" : " · " + t("keyMissing")), e.id)));
    if (endpoints.some((e) => e.id === previous)) select.value = previous;
    if (activeChat()) activeChat().endpointID = select.value;
    $("endpoint-count").textContent = String(endpoints.length);
    $("welcome-connect").textContent = t(endpoints.length ? "endpoints" : "connect");
    window.OpenAkitaChatControls?.refresh();
  }
  function renderContent(target, text) {
    target.replaceChildren();
    // Render text and fenced code through DOM APIs; model HTML never executes.
    text.split(/```[^\n]*\n([\s\S]*?)(?:```|$)/g).forEach((part, index) => {
      if (!part) return;
      if (index % 2) { const pre = node("pre"); pre.append(node("code", "", part)); target.append(pre); }
      else target.append(node("p", "", part));
    });
  }
  function renderMessages() {
    const chat = activeChat(); const container = $("messages"); container.replaceChildren();
    $("chat-welcome").hidden = !!chat?.messages.length;
    (chat?.messages || []).forEach((message, index) => {
      const row = node("article", "chat-message " + message.role);
      row.append(node("div", "chat-message-avatar", message.role === "user" ? "YOU" : "OA"));
      const body = node("div", "chat-message-body");
      body.append(node("div", "chat-message-label", message.role === "user" ? t("you") : message.model || t("assistant")));
      const content = node("div", "chat-message-content"); renderContent(content, message.content || (message.status === "pending" ? t("pending") : "")); body.append(content);
      if (["failed", "stopped"].includes(message.status)) body.append(node("div", "chat-message-note", t(message.status === "stopped" ? "stopped" : "interrupted")));
      const actions = node("div", "chat-message-actions");
      if (message.content) {
        const button = node("button", "", t("copy")); button.type = "button";
        button.addEventListener("click", async () => { try { await navigator.clipboard.writeText(message.content); button.textContent = t("copied"); } catch (_) { $("chat-status").textContent = t("failedCopy"); } }); actions.append(button);
      }
      if (message.role === "assistant" && index === chat.messages.length - 1 && !controller) {
        const retry = node("button", "", t("retry")); retry.type = "button";
        retry.addEventListener("click", () => send(true)); actions.append(retry);
      }
      body.append(actions); row.append(body); container.append(row);
    });
    container.setAttribute("aria-busy", String(!!controller));
  }
  function render() {
    renderSidebar(); renderEndpointPicker(); renderMessages();
    for (const id of ["new-chat", "active-endpoint", "manage-endpoints", "delete-chat", "export-chat"]) $(id).disabled = !!controller;
    $("send-message").hidden = !!controller; $("stop-message").hidden = !controller;
    $("chat-input").disabled = !!controller; $("send-message").disabled = !enabled;
    for (const [id, label] of [["delete-chat", "deleteLabel"], ["export-chat", "exportLabel"]]) {
      $(id).title = t(controller ? "generatingActions" : !activeChat()?.messages.length ? "noConversation" : label);
    }
  }
  function showActionStatus(key) {
    clearTimeout(actionStatusTimer); actionStatusKey = key;
    $("chat-action-status").textContent = t(key); $("chat-action-status").hidden = false;
    actionStatusTimer = setTimeout(() => { actionStatusKey = ""; $("chat-action-status").hidden = true; }, 6000);
  }
  function exportConversation() {
    if (controller) return;
    const chat = activeChat();
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
  function requestDeleteConversation() {
    if (controller) return;
    const chat = activeChat();
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
      const remove = node("button", "", t("remove")); remove.type = "button"; remove.addEventListener("click", () => { if (!window.confirm(t("confirmEndpoint"))) return; keys.delete(endpoint.id); endpoints = endpoints.filter((e) => e.id !== endpoint.id); resetEndpoint(); persist(); render(); renderEndpointList(); });
      row.append(edit, remove); list.append(row);
    });
  }
  function providerChanged() {
    if (modelsController) modelsController.abort();
    const provider = providers[$("endpoint-provider").value];
    $("endpoint-url").value = provider.url; $("provider-key-link").href = provider.keys;
    $("provider-models").replaceChildren(); $("endpoint-status").textContent = "";
    window.OpenAkitaChatControls?.refresh();
  }
  function resetEndpoint() {
    editingID = null; $("endpoint-form").reset(); providerChanged();
    $("endpoint-name").value = "My " + providers[$("endpoint-provider").value].name;
    $("endpoint-form-title").textContent = t("addEndpoint");
    window.OpenAkitaChatControls?.refresh();
  }
  function editEndpoint(endpoint) {
    editingID = endpoint.id; $("endpoint-provider").value = endpoint.provider; providerChanged();
    $("endpoint-name").value = endpoint.name; $("endpoint-key").value = keys.get(endpoint.id) || ""; $("endpoint-model").value = endpoint.model;
    $("endpoint-form-title").textContent = t("editEndpoint"); $("endpoint-key").focus();
    window.OpenAkitaChatControls?.refresh();
  }
  function openEndpoints(endpoint) { resetEndpoint(); renderEndpointList(); if (endpoint) editEndpoint(endpoint); $("endpoint-dialog").showModal(); }
  async function api(path, payload, signal) {
    const response = await fetch("/api/v1/chat/" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal });
    if (!response.ok) { let code = "network_error"; try { code = (await response.json()).error || code; } catch (_) {} throw new Error(code); }
    return response;
  }
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
    controller = new AbortController(); $("chat-input").value = ""; $("chat-status").textContent = t("sending"); persist(); render();
    let completed = false;
    let reader;
    try {
      const response = await api("completions", { provider: endpoint.provider, api_key: keys.get(endpoint.id), model: endpoint.model, messages }, controller.signal);
      if (!response.body || !response.headers.get("content-type")?.startsWith("text/event-stream")) throw new Error("invalid_provider_response");
      reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      function consume(frame) {
        const data = frame.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!data) return;
        let event; try { event = JSON.parse(data); } catch (_) { throw new Error("invalid_provider_response"); }
        if (event.error) throw new Error(event.error);
        if (event.text) {
          if (answer.content.length + event.text.length > 100000) throw new Error("invalid_provider_response");
          const scroll = $("chat-scroll"); const atBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 100;
          answer.content += event.text; $("chat-status").textContent = t("receiving"); renderMessages();
          if (atBottom) scroll.scrollTop = scroll.scrollHeight;
        }
        if (event.done) completed = true;
      }
      while (!completed) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
        if (buffer.length > 1 << 20) throw new Error("invalid_provider_response");
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) { const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2); consume(frame); }
        if (chunk.done) { if (buffer.trim()) consume(buffer); break; }
      }
      if (!completed) throw new Error("stream_interrupted");
      if (!answer.content.trim()) throw new Error("empty_response");
      answer.status = "done"; $("chat-status").textContent = "";
    } catch (error) {
      answer.status = error.name === "AbortError" ? "stopped" : "failed";
      $("chat-status").textContent = error.name === "AbortError" ? t("stopped") : errorText(error.message);
    } finally {
      if (reader) { try { await reader.cancel(); } catch (_) {} }
      controller = null; persist(); render(); $("chat-input").focus();
      if (storageFailed) $("chat-status").textContent = t("storageError");
    }
  }
  function setup() {
    const languageSwitch = document.querySelector(".site-header .lang-switch");
    if (languageSwitch) $("chat-language").append(languageSwitch);
    restore(); resetEndpoint(); localize();
    const languageSelect = document.querySelector(".lang-select");
    if (languageSelect) { Array.from(languageSelect.options).forEach((option) => { if (!["zh", "en"].includes(option.value)) option.remove(); }); }
    document.addEventListener("openakita:language-changed", () => { language = document.documentElement.lang.startsWith("zh") ? "zh" : "en"; try { localStorage.setItem("openakita_chat_language", language); } catch (_) {} localize(); renderEndpointList(); });
    $("new-chat").addEventListener("click", () => { activeID = null; $("chat-input").value = ""; $("chat-status").textContent = ""; $("chat-sidebar").classList.remove("open"); render(); $("chat-input").focus(); });
    $("search-chats").addEventListener("input", renderSidebar);
    $("manage-endpoints").addEventListener("click", () => openEndpoints());
    $("welcome-connect").addEventListener("click", () => openEndpoints());
    $("close-endpoints").addEventListener("click", () => $("endpoint-dialog").close());
    $("endpoint-dialog").addEventListener("close", () => { if (modelsController) modelsController.abort(); $("endpoint-key").value = ""; });
    $("reset-endpoint").addEventListener("click", resetEndpoint);
    $("endpoint-provider").addEventListener("change", () => { providerChanged(); $("endpoint-key").value = ""; $("endpoint-model").value = ""; $("endpoint-name").value = "My " + providers[$("endpoint-provider").value].name; });
    $("endpoint-form").addEventListener("submit", (event) => {
      event.preventDefault(); const key = $("endpoint-key").value.trim(), model = $("endpoint-model").value.trim(), name = $("endpoint-name").value.trim();
      if (!key || !model || !name) { $("endpoint-status").textContent = errorText("invalid_endpoint"); return; }
      if (!editingID && endpoints.length >= 30) { $("endpoint-status").textContent = errorText("invalid_endpoint"); return; }
      const id = editingID || uid(); const endpoint = { id, provider: $("endpoint-provider").value, name, model };
      if (editingID) endpoints = endpoints.map((e) => e.id === id ? endpoint : e); else endpoints.push(endpoint);
      keys.set(id, key); if (activeChat()) activeChat().endpointID = id;
      persist(); render(); $("active-endpoint").value = id; $("endpoint-dialog").close(); $("chat-input").focus();
      window.OpenAkitaChatControls?.refresh();
    });
    $("load-models").addEventListener("click", async () => {
      const key = $("endpoint-key").value.trim(); if (!key) { $("endpoint-key").reportValidity(); return; }
      if (modelsController) modelsController.abort();
      const current = new AbortController(); modelsController = current; const provider = $("endpoint-provider").value;
      $("load-models").disabled = true; $("endpoint-status").textContent = t("loadingModels");
      try {
        const response = await api("models", { provider, api_key: key }, current.signal); const data = await response.json();
        if (provider !== $("endpoint-provider").value || current.signal.aborted) return;
        $("provider-models").replaceChildren();
        (data.models || []).sort().forEach((model) => { const option = document.createElement("option"); option.value = model; $("provider-models").append(option); });
        $("endpoint-status").textContent = t(data.models?.length ? "modelsLoaded" : "noModels");
        window.OpenAkitaChatControls?.refresh();
        if (data.models?.length) { $("endpoint-model").focus(); window.OpenAkitaChatControls?.show("endpoint-model"); }
      } catch (error) { if (error.name !== "AbortError") $("endpoint-status").textContent = errorText(error.message); }
      finally { if (modelsController === current) { modelsController = null; $("load-models").disabled = false; } }
    });
    $("active-endpoint").addEventListener("change", () => { if (activeChat()) activeChat().endpointID = $("active-endpoint").value; persist(); });
    $("composer").addEventListener("submit", (event) => { event.preventDefault(); send(false); });
    $("chat-input").addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey && !event.isComposing) { event.preventDefault(); send(false); } });
    $("stop-message").addEventListener("click", () => controller?.abort());
    $("delete-chat").addEventListener("click", requestDeleteConversation);
    $("export-chat").addEventListener("click", exportConversation);
    $("cancel-delete-chat").addEventListener("click", () => $("delete-chat-dialog").close());
    $("delete-chat-dialog").addEventListener("close", () => { pendingDeleteID = null; });
    $("confirm-delete-chat").addEventListener("click", () => {
      if (controller || !pendingDeleteID) return;
      conversations = conversations.filter((chat) => chat.id !== pendingDeleteID);
      if (activeID === pendingDeleteID) { activeID = null; $("chat-input").value = ""; $("chat-status").textContent = ""; }
      persist(); render(); $("delete-chat-dialog").close(); showActionStatus("deleted"); $("chat-input").focus();
    });
    $("open-sidebar").addEventListener("click", () => $("chat-sidebar").classList.add("open"));
    $("close-sidebar").addEventListener("click", () => $("chat-sidebar").classList.remove("open"));
    document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => { $("chat-input").value = t(button.dataset.prompt + "Prompt"); $("chat-input").focus(); }));
    window.addEventListener("beforeunload", (event) => { if (controller) { event.preventDefault(); event.returnValue = ""; } });
  }
  async function init() {
    const allowed = ["openakita.ai", "www.openakita.ai", "localhost", "127.0.0.1", "[::1]"].includes(location.hostname.toLowerCase());
    if (!allowed) {
      $("chat-gate").replaceChildren(node("p", "", t("unavailable")));
      const link = node("a", "", t("goAI")); link.href = "https://openakita.ai/chat/"; $("chat-gate").append(link); return;
    }
    $("chat-gate").textContent = t("connecting");
    try {
      const response = await fetch("/api/v1/chat/capabilities", { signal: AbortSignal.timeout(8000) });
      if (!response.ok || !(await response.json()).enabled) throw new Error("unavailable");
      enabled = true; setup(); $("chat-gate").hidden = true; $("web-chat").hidden = false;
    } catch (_) { $("chat-gate").textContent = t("unavailableServer"); }
  }
  init();
})();
