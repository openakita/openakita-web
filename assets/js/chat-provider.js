(function () {
  "use strict";
  const providers = Object.freeze({
    openai: Object.freeze({ name: "OpenAI", url: "https://api.openai.com/v1", keys: "https://platform.openai.com/api-keys" }),
    anthropic: Object.freeze({ name: "Claude", url: "https://api.anthropic.com/v1", keys: "https://console.anthropic.com/settings/keys" }),
    xai: Object.freeze({ name: "Grok", url: "https://api.x.ai/v1", keys: "https://console.x.ai/" }),
    deepseek: Object.freeze({ name: "DeepSeek", url: "https://api.deepseek.com", keys: "https://platform.deepseek.com/api_keys" }),
  });
  const isAllowedHost = (host) => ["openakita.ai", "www.openakita.ai", "localhost", "127.0.0.1", "[::1]"].includes(host.toLowerCase());
  const fail = (code) => { throw new Error(code); };
  function headers(provider, key) {
    if (!isAllowedHost(location.hostname)) fail("chat_unavailable");
    if (!Object.hasOwn(providers, provider) || typeof key !== "string" || !key.trim() || key.length > 4096 || /[\r\n\0]/.test(key)) fail("invalid_endpoint");
    return provider === "anthropic"
      ? { "x-api-key": key.trim(), "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }
      : { Authorization: "Bearer " + key.trim() };
  }
  function providerError(status, body) {
    const type = body?.error?.type || body?.error?.code || body?.type || body?.code || "";
    const message = typeof body?.error === "string" ? body.error : body?.error?.message || "";
    if ([401, 403].includes(status) || /authentication_error|invalid_api_key|unauthenticated/.test(type) || /(?:incorrect|invalid)\s+(?:x-)?api[ -]?key/i.test(message)) return "provider_auth_failed";
    if (status === 429 || type === "rate_limit_error") return "provider_rate_limited";
    if (status === 413) return "conversation_too_large";
    if ([400, 404, 422].includes(status) || type === "invalid_request_error") return "provider_request_rejected";
    return "provider_unavailable";
  }
  function connectionError(error) {
    if (error.name === "TimeoutError") return new Error("provider_timeout");
    if (error.name === "TypeError") return new Error("browser_connection_failed");
    return error;
  }
  async function request(url, options, signal) {
    signal.throwIfAborted();
    const response = await fetch(url, { ...options, mode: "cors", credentials: "omit", redirect: "error", cache: "no-store", signal });
    if (!response.ok) {
      let body; try { body = await response.json(); } catch (_) { signal.throwIfAborted(); }
      // Raw provider errors may contain a key or message: expose only local codes.
      fail(providerError(response.status, body));
    }
    return response;
  }
  async function listModels(provider, key, abortSignal) {
    const auth = headers(provider, key);
    const signal = AbortSignal.any([abortSignal, AbortSignal.timeout(20000)]);
    const ids = new Set(); let cursor = "";
    try {
      for (let page = 0; page < 10; page++) {
        const query = provider === "anthropic" ? "?limit=100" + (cursor ? "&after_id=" + encodeURIComponent(cursor) : "") : "";
        const response = await request(providers[provider].url + "/models" + query, { headers: auth }, signal);
        let data; try { data = await response.json(); } catch (_) { signal.throwIfAborted(); fail("invalid_provider_response"); }
        if (!Array.isArray(data?.data)) fail("invalid_provider_response");
        for (const model of data.data) if (typeof model?.id === "string" && model.id.trim() && model.id.length <= 200 && ids.size < 1000) ids.add(model.id);
        if (provider !== "anthropic" || !data.has_more) break;
        if (typeof data.last_id !== "string" || !data.last_id || data.last_id === cursor) fail("invalid_provider_response");
        cursor = data.last_id;
      }
      return Array.from(ids).sort();
    } catch (error) { throw connectionError(error); }
  }
  async function streamCompletion(input, onText, abortSignal) {
    const { provider, key, model, messages } = input;
    const auth = headers(provider, key);
    if (typeof model !== "string" || !model.trim() || model.length > 200) fail("invalid_endpoint");
    if (!Array.isArray(messages) || !messages.length || messages.length > 100 || messages.length % 2 !== 1 || messages.some((m, i) => m?.role !== (i % 2 ? "assistant" : "user") || typeof m.content !== "string" || !m.content.trim())) fail("invalid_conversation");
    const payload = { model: model.trim(), messages: messages.map(({ role, content }) => ({ role, content })), stream: true };
    if (provider === "openai") { payload.max_completion_tokens = 4096; payload.store = false; }
    else payload.max_tokens = 4096;
    const body = JSON.stringify(payload);
    if (new TextEncoder().encode(body).length > 512 * 1024) fail("conversation_too_large");
    const signal = AbortSignal.any([abortSignal, AbortSignal.timeout(180000)]);
    let reader;
    try {
      const path = provider === "anthropic" ? "/messages" : "/chat/completions";
      const response = await request(providers[provider].url + path, { method: "POST", headers: { ...auth, "Content-Type": "application/json", Accept: "text/event-stream" }, body }, signal);
      if (!response.body || !response.headers.get("content-type")?.toLowerCase().startsWith("text/event-stream")) fail("invalid_provider_response");
      reader = response.body.getReader();
      const decoder = new TextDecoder(); let buffer = "", completed = false, outputLength = 0, receivedBytes = 0, limited = false;
      function emit(text) {
        if (typeof text !== "string") fail("invalid_provider_response");
        if (!text) return;
        outputLength += text.length; if (outputLength > 100000) fail("invalid_provider_response");
        onText(text);
      }
      function consume(frame) {
        const lines = frame.split(/\r\n|\n|\r/);
        const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).replace(/^ /, "")).join("\n");
        if (!data.trim()) return;
        if (provider !== "anthropic" && data.trim() === "[DONE]") { completed = true; return; }
        let event; try { event = JSON.parse(data); } catch (_) { fail("invalid_provider_response"); }
        if (!event || typeof event !== "object") fail("invalid_provider_response");
        if (event.error || event.type === "error") fail(providerError(200, event));
        if (provider === "anthropic") {
          if (event.type === "content_block_start" && event.content_block?.type === "text") emit(event.content_block.text || "");
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") emit(event.delta.text);
          if (event.type === "message_delta" && event.delta?.stop_reason === "max_tokens") limited = true;
          if (event.type === "message_stop") completed = true;
        } else {
          if (!Array.isArray(event.choices)) fail("invalid_provider_response");
          const choice = event.choices.find((item) => item.index === 0) || event.choices[0];
          if (choice?.delta?.content != null) emit(choice.delta.content);
          if (choice?.finish_reason === "length") limited = true;
        }
      }
      while (!completed) {
        signal.throwIfAborted();
        const chunk = await reader.read();
        receivedBytes += chunk.value?.byteLength || 0;
        if (receivedBytes > 8 * 1024 * 1024) fail("invalid_provider_response");
        buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
        if (buffer.length > 1 << 20) fail("invalid_provider_response");
        let boundary;
        while (!completed && (boundary = /\r\n\r\n|\n\n|\r\r|\r\n\n|\n\r\n/.exec(buffer))) {
          const frame = buffer.slice(0, boundary.index); buffer = buffer.slice(boundary.index + boundary[0].length); consume(frame);
        }
        if (chunk.done) { if (!completed && buffer.trim()) consume(buffer); break; }
      }
      if (!completed) fail("stream_interrupted");
      if (limited) fail("response_truncated");
      if (!outputLength) fail("empty_response");
    } catch (error) { throw connectionError(error); }
    finally { if (reader) { try { await reader.cancel(); } catch (_) {} } }
  }
  window.OpenAkitaChatProvider = Object.freeze({ providers, isAllowedHost, listModels, streamCompletion });
})();
