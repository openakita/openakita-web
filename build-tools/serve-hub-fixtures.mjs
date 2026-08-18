import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = resolve(projectRoot, "dist");
const fixtureDirectory = resolve(projectRoot, "build-tools/fixtures/hub");
const port = Number.parseInt(process.env.HUB_FIXTURE_PORT || "4180", 10);
const allowedFixtures = new Set(["success", "empty", "partial", "pass-partial", "unavailable", "unauthorized", "disabled", "rate-limited"]);

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Request-ID": "fixture-request-001"
  });
  response.end(JSON.stringify(body));
}

function requestedFixture(request) {
  try {
    const referer = new URL(request.headers.referer || "http://127.0.0.1/");
    const value = referer.searchParams.get("hub_fixture") || "success";
    return allowedFixtures.has(value) ? value : "success";
  } catch {
    return "success";
  }
}

function serveHub(request, response) {
  const selected = requestedFixture(request);
  if (["success", "empty", "partial", "pass-partial"].includes(selected)) {
    const body = JSON.parse(readFileSync(resolve(fixtureDirectory, `${selected}.json`), "utf8"));
    json(response, 200, body);
    return;
  }
  if (selected === "unauthorized") {
    const fixture = JSON.parse(readFileSync(resolve(fixtureDirectory, "unauthorized.json"), "utf8"));
    json(response, fixture.status, fixture.body);
    return;
  }
  if (selected === "disabled") {
    json(response, 403, { error: "account_disabled" });
    return;
  }
  if (selected === "rate-limited") {
    json(response, 429, { error: "rate_limited" });
    return;
  }
  json(response, 503, { error: "internal_error" });
}

function contentType(path) {
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
  })[extname(path).toLowerCase()] || "application/octet-stream";
}

function staticPath(requestUrl) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return undefined; }
  const candidate = resolve(outputDirectory, `.${pathname.endsWith("/") ? pathname + "index.html" : pathname}`);
  const relation = relative(outputDirectory, candidate);
  if (relation === ".." || relation.startsWith(`..${sep}`)) return undefined;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  const indexCandidate = resolve(candidate, "index.html");
  if (existsSync(indexCandidate) && statSync(indexCandidate).isFile()) return indexCandidate;
  return undefined;
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  if (url.pathname === "/api/v1/hub") {
    serveHub(request, response);
    return;
  }
  if (url.pathname === "/api/v1/session") {
    json(response, 200, {
      authenticated: true,
      user: { display_name: "Fixture User", email_label: "f***@example.com", email_verified: true },
      csrf_token: "fixture-csrf",
      links: { hub: "/account", pass_console: "https://pass.example/console" }
    });
    return;
  }
  if (url.pathname === "/auth/login") {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    response.end("Fixture login endpoint");
    return;
  }
  const path = staticPath(request.url || "/");
  if (!path) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": contentType(path) });
  response.end(readFileSync(path));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[hub-fixtures] http://127.0.0.1:${port}/account/?hub_fixture=success`);
});
