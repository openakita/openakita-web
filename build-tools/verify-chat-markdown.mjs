import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const dom = new JSDOM('<main><div id="message"></div></main>', { url: "https://openakita.ai/chat/", runScripts: "outside-only" });
const { window } = dom;
window.OpenAkitaChatI18n = { t: key => ({ copy: "Copy", copied: "Copied", failedCopy: "Copy failed" })[key] };
let copied = "";
Object.defineProperty(window.navigator, "clipboard", { value: { writeText: async text => { copied = text; } } });
window.eval(readFileSync(new URL("../dist/assets/js/chat-markdown.js", import.meta.url), "utf8"));
const target = window.document.getElementById("message"), client = window.OpenAkitaChatMarkdown;
const render = (text, streaming = false) => client.render(target, text, { streaming });
let checks = 0;
render("# Heading\n\n**Bold** and *italic* and ~~removed~~ with `inline()`\nline two\n\n> Quote\n\n---\n\n1. First\n2. Second\n   - Nested\n\n- [x] Complete\n- [ ] Pending\n\n| Name | Value |\n| :--- | ---: |\n| Test | 42 |\n\n[Docs](https://example.com/docs) and [relative](../download/)\n\n![image](https://example.com/a.png)");
for (const selector of ["h1", "strong", "em", "del", "p > code", "br", "blockquote", "hr", "ol", "ol ul", "table", "thead", "tbody", 'td[align="right"]', "img"]) assert.ok(target.querySelector(selector), `render ${selector}`);
assert.equal(target.querySelectorAll('input[type="checkbox"]:disabled').length, 2);
assert.equal(target.querySelectorAll('input[type="checkbox"]:checked').length, 1);
assert.equal(target.querySelector("a").rel, "noopener noreferrer");
assert.equal(target.querySelectorAll("a[href]").length, 2, "safe relative and external links remain usable");
assert.ok(target.querySelector(".chat-table-scroll > table")); checks++;

for (const [language, code] of [["js", 'const text = "你好🙂";\nconsole.log(text);'], ["python", 'def greet(name):\n    return "Hello " + name'], ["json", '{"ok": true, "count": 42}'], ["bash", 'echo "$HOME"'], ["sql", 'SELECT name FROM users WHERE id = 42;'], ["html", '<div class="hello">Hello</div>']]) {
  render('```' + language + '\n' + code + '\n```');
  assert.ok(target.querySelector("pre code .hljs-string, pre code .hljs-keyword, pre code .hljs-attr, pre code .hljs-tag, pre code .hljs-built_in"), language + ": syntax tokens");
  assert.equal(target.querySelector("pre code").textContent.trimEnd(), code);
  assert.equal(target.querySelector(".chat-code-toolbar span").textContent, language);
  target.querySelector(".chat-code-toolbar button").click(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(copied.trimEnd(), code, language + ": copy raw source without markup");
  assert.equal(target.querySelector(".chat-code-toolbar button").getAttribute("aria-label"), "Copied");
  assert.ok(target.querySelector(".chat-code-toolbar button svg")); checks++;
}
render('```unknown-language\n<div>plain</div>\n```');
assert.equal(target.querySelector("pre code").textContent.trimEnd(), "<div>plain</div>");
assert.equal(target.querySelector("pre code span"), null); checks++;
render('```\nconst answer = "hello";\nconsole.log(answer);\n```');
assert.ok(target.querySelector("pre code span"), "detect language when fence has no label"); checks++;

const streamed = '# Streaming\n\n- First\n- Second\n\n```python\ndef greet():\n    return "你好🙂"\n```';
for (let length = 1; length <= streamed.length; length++) {
  render(streamed.slice(0, length), true);
  assert.equal(target.querySelector("script,iframe,form"), null, "every incomplete stream remains safe");
  assert.ok(Array.from(target.querySelectorAll("svg")).every(svg => svg.parentElement.matches("button.chat-action-icon")), "only trusted action icons use SVG");
}
render(streamed);
assert.ok(target.querySelector("h1")); assert.ok(target.querySelector("pre .hljs-keyword")); checks++;

render('<script>alert(1)</script><img src="x" onerror="alert(1)"><svg onload="alert(1)"></svg><iframe srcdoc="<script>alert(1)</script>"></iframe><style>body{display:none}</style><form><input name="secret"></form><span class="chat-sidebar open" id="composer" style="position:fixed">Safe text</span>\n\n[bad](javascript:alert%281%29)\n\n[bad-data](data:text/html,evil)\n\n![bad-svg](data:image/svg+xml,evil)');
assert.equal(target.querySelector("script,iframe,style,form,input:not([type=checkbox]),[id],[style],[onerror],[onload],.chat-sidebar"), null);
assert.ok(Array.from(target.querySelectorAll("svg")).every(svg => svg.parentElement.matches("button.chat-action-icon")), "model-provided SVG is removed");
for (const link of target.querySelectorAll("a[href]")) assert.ok(!/^(?:javascript|data):/i.test(link.getAttribute("href")));
assert.equal(target.querySelector('img[src^="data:"]'), null); checks++;

render('```html\n<script>alert("example")</script>\n```');
assert.equal(target.querySelector("script"), null);
assert.match(target.querySelector("pre code").textContent, /<script>/, "HTML source is displayed instead of executed"); checks++;

render('```js\nconst value = 1;\n```');
target.querySelector("pre code").textContent = "mutated";
render('```js\nconst value = 1;\n```');
assert.equal(target.querySelector("pre code").textContent.trimEnd(), "const value = 1;", "cached fragments are isolated from rendered DOM");
window.OpenAkitaChatI18n.t = key => key === "copy" ? "复制" : key;
render('```js\nconst value = 1;\n```');
assert.equal(target.querySelector(".chat-code-toolbar button").getAttribute("aria-label"), "复制", "cached message controls follow current language"); checks++;

render('```python\n' + 'print("long")\n'.repeat(3000) + '```');
assert.ok(target.querySelector("pre code").textContent.length > 30000);
assert.equal(target.querySelector("pre code span"), null, "large code remains readable without expensive highlighting"); checks++;
dom.window.close();
console.log(`[verify-chat-markdown] OK: ${checks} checks for GFM, syntax highlighting, stream prefixes, copy, localization, safe HTML/links and bounded rendering`);
