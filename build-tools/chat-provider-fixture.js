// Injected by the local fixture server only; never copied into production assets.
(function () {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (url, options = {}) {
    const parsed = new URL(url, location.href);
    const provider = { "api.openai.com": "openai", "api.anthropic.com": "anthropic", "api.x.ai": "xai", "api.deepseek.com": "deepseek" }[parsed.hostname];
    if (!provider) return originalFetch(url, options);
    if (options.signal?.aborted) throw options.signal.reason;
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
    if (parsed.pathname.endsWith("/models")) return json({ data: [{ id: "fixture-text-model" }, { id: "fixture-second-model" }], has_more: false });
    const input = JSON.parse(options.body);
    const prompt = input.messages.at(-1).content;
    if (prompt.includes("fixture:error")) return json({ error: { type: "authentication_error", message: "Invalid API key (local fixture)" } }, 401);
    const text = prompt.includes("fixture:markdown")
      ? "## Markdown preview\n\n**Bold text**, *italic text*, ~~removed~~ and `inline code`.\n\n> A clear thought starts with a good question.\n\n1. First step\n2. Second step\n   - A nested detail\n\n- [x] Markdown rendering\n- [x] Syntax highlighting\n\n| Feature | Status |\n| :--- | :--- |\n| Tables | Ready |\n| Code highlighting | Ready |\n\n```python\ndef greet(name):\n    return f\"Hello, {name}!\"\n\nprint(greet(\"OpenAkita\"))\n```\n\n[OpenAkita](https://openakita.ai/)\n"
      : "Local browser fixture response from " + provider + ".\n\n你好，浏览器直连对话已完成。\n\n```js\nconsole.log('Hello, OpenAkita');\n```\n\n<script>alert('unsafe')</script> stays plain text.";
    const encoder = new TextEncoder(); let offset = 0, timer, stream;
    const startedAt = Date.now(), responseDelay = prompt.includes("fixture:wait") ? 1800 : 0;
    const frame = (value) => encoder.encode("data: " + (typeof value === "string" ? value : JSON.stringify(value)) + "\r\n\r\n");
    function clean() { clearInterval(timer); options.signal?.removeEventListener("abort", abort); }
    function abort() { clean(); stream.error(options.signal.reason); }
    return new Response(new ReadableStream({
      start(controller) {
        stream = controller; options.signal?.addEventListener("abort", abort, { once: true });
        timer = setInterval(() => {
          if (Date.now() - startedAt < responseDelay) return;
          if (offset >= text.length) {
            controller.enqueue(provider === "anthropic" ? frame({ type: "message_stop" }) : frame("[DONE]"));
            clean(); controller.close(); return;
          }
          const content = text.slice(offset, offset += 8);
          controller.enqueue(provider === "anthropic" ? frame({ type: "content_block_delta", delta: { type: "text_delta", text: content } }) : frame({ choices: [{ index: 0, delta: { content }, finish_reason: null }] }));
        }, prompt.includes("fixture:slow") ? 400 : 25);
      },
      cancel() { clean(); },
    }), { headers: { "Content-Type": "text/event-stream" } });
  };
})();
