// Local UI verification only. Never included in the production static output.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  if (path === "/api/v1/session") { response.setHeader("Content-Type", "application/json"); response.end('{"authenticated":false,"login_url":"/auth/login"}'); return; }
  if (path === "/api/v1/chat/capabilities") { response.setHeader("Content-Type", "application/json"); response.end('{"enabled":true}'); return; }
  if (path.startsWith("/api/v1/chat/")) {
    let raw = ""; for await (const chunk of request) raw += chunk;
    let input; try { input = JSON.parse(raw); } catch { response.writeHead(400); response.end(); return; }
    if (path.endsWith("/models")) { response.setHeader("Content-Type", "application/json"); response.end(JSON.stringify({ models: ["fixture-text-model", "fixture-second-model"] })); return; }
    if (input.messages.at(-1).content.includes("fixture:error")) { response.writeHead(400, { "Content-Type": "application/json" }); response.end('{"error":"provider_auth_failed"}'); return; }
    response.writeHead(200, { "Content-Type": "text/event-stream" }); response.flushHeaders();
    const text = "This is a local test response from " + input.provider + ".\n\nYour conversation is working.\n\n```js\nconsole.log('Hello, OpenAkita');\n```\n\n<script>alert('unsafe')</script> stays plain text.";
    let offset = 0;
    const timer = setInterval(() => { if (offset >= text.length) { response.end('data: {"done":true}\n\n'); clearInterval(timer); return; } response.write("data: " + JSON.stringify({ text: text.slice(offset, offset + 6) }) + "\n\n"); offset += 6; }, input.messages.at(-1).content.includes("fixture:slow") ? 500 : 25);
    response.on("close", () => clearInterval(timer)); return;
  }
  try {
    let target = resolve(root, "." + decodeURIComponent(path));
    if (target !== resolve(root) && !target.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error("outside root");
    if ((await stat(target)).isDirectory()) target = resolve(target, "index.html");
    response.setHeader("Content-Type", types[extname(target)] || "application/octet-stream");
    response.end(await readFile(target));
  } catch { response.writeHead(404); response.end("Not found"); }
});
server.listen(4184, "127.0.0.1", () => console.log("Local chat fixtures: http://127.0.0.1:4184/chat/ (mock providers, no real API calls)"));
