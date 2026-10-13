// Local UI verification only. Neither this server nor its fixtures are published.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const mock = !process.argv.includes("--static");
const portArgument = process.argv.find(argument => argument.startsWith("--port="));
const port = portArgument ? Number(portArgument.slice(7)) : 4184;
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid preview port");
const fixture = await readFile(new URL("./chat-provider-fixture.js", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  if (mock && path === "/__fixtures__/chat-provider.js") { response.setHeader("Content-Type", "text/javascript"); response.end(fixture); return; }
  if (path.startsWith("/api/v1/")) { response.writeHead(404); response.end("No website API is running"); return; }
  try {
    let target = resolve(root, "." + decodeURIComponent(path));
    if (target !== resolve(root) && !target.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error("outside root");
    if ((await stat(target)).isDirectory()) target = resolve(target, "index.html");
    response.setHeader("Content-Type", types[extname(target)] || "application/octet-stream");
    response.setHeader("Cache-Control", "no-store");
    let content = await readFile(target);
    if (mock && path.startsWith("/chat") && extname(target) === ".html") content = content.toString().replace("</head>", '<script src="/__fixtures__/chat-provider.js"></script></head>');
    response.end(content);
  } catch { response.writeHead(404); response.end("Not found"); }
}).listen(port, "127.0.0.1", () => console.log("Browser chat preview: http://127.0.0.1:" + port + "/chat/ (" + (mock ? "mock browser providers" : "static only, direct real provider requests") + ")"));
