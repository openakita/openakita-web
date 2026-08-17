import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const failures = [];

function read(path) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

function fixture(name) {
  return JSON.parse(read(`build-tools/fixtures/hub/${name}.json`));
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

function fail(message) {
  failures.push(message);
}

function validateOkModule(payload, name) {
  const module = payload[name];
  if (!module || module.status !== "ok" || !module.data || typeof module.data !== "object") {
    fail(`${name} fixture module must use status=ok with data`);
  }
}

function inspectKeys(value, path = "response") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectKeys(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  const forbidden = /^(?:access_token|refresh_token|id_token|authorization|cookie|raw_email|balance|payment|orders?|team|usage|api_key|pass)$/i;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.test(key)) fail(`${path}.${key} is forbidden in the Phase 1 Hub contract`);
    inspectKeys(child, `${path}.${key}`);
  }
}

const sourcePath = "account/index.html";
const outputPath = "dist/account/index.html";
const scriptPath = "assets/js/account.js";
if (!existsSync(resolve(projectRoot, sourcePath))) fail(`${sourcePath} is missing`);
if (!existsSync(resolve(projectRoot, outputPath))) fail(`${outputPath} is missing; run npm run build first`);

if (failures.length === 0) {
  const source = read(sourcePath);
  const output = read(outputPath);
  const script = read(scriptPath);

  if (count(source, 'data-hub-module="') !== 3) fail("account page must define exactly three Hub modules");
  for (const name of ["account", "marketplace", "entitlements"]) {
    if (!source.includes(`data-hub-module="${name}"`)) fail(`account page is missing ${name} module`);
    if (!source.includes(`data-hub-retry="${name}"`)) fail(`account page is missing ${name} retry control`);
  }
  if (!source.includes('content="noindex,nofollow,noarchive"')) fail("account page must be excluded from indexing and archives");
  if (source.includes("tracker.js")) fail("protected account page must not load the public analytics tracker");
  if (!source.includes("assets/js/account.js")) fail("account page must load its Hub client");

  if (!script.includes('fetch("/api/v1/hub"')) fail("Hub client must call the same-origin v1 Hub endpoint");
  if (!script.includes('credentials: "same-origin"')) fail("Hub client must send only same-origin credentials");
  if (!script.includes("response.status === 401") || !script.includes("safeLoginUrl") || !script.includes("window.location.assign")) {
    fail("Hub client must safely handle authentication expiry");
  }
  if (!script.includes('envelope.status !== "ok"') || !script.includes('setModuleState(name, "unavailable")')) {
    fail("Hub client must degrade modules independently");
  }
  if (!script.includes("AbortController") || !script.includes("4000")) fail("Hub client must bound request latency");
  if (/\binnerHTML\b/.test(script)) fail("Hub client must render untrusted data with DOM text APIs, not innerHTML");
  if (/localStorage|sessionStorage|document\.cookie/.test(script)) fail("Hub client must not access browser token or cookie storage");
  if (count(script, "fetch(") !== 1) fail("Hub client must not call Account or Marketplace directly");

  if (count(output, 'data-hub-module="') !== 3) fail("built account page must preserve three Hub modules");
  if (!output.includes('<header class="site-header">') || !output.includes('<footer class="site-footer">')) {
    fail("built account page must use the shared public shell");
  }
  if (!output.includes('href="https://marketplace.fzstack.com/catalog"') || !output.includes('data-marketplace-target-id="catalog:all"')) {
    fail("built account page must receive its Marketplace explore link from config");
  }
  if (!output.includes('href="https://marketplace.fzstack.com/library"') || !output.includes('data-marketplace-target-id="marketplace:library"')) {
    fail("built account page must receive its Marketplace library link from config");
  }
  if (!/assets\/js\/account\.js\?v=[a-f0-9]{12}/.test(output)) fail("built account page must version the Hub client");

  const forbiddenCopy = /(?:\bOpenAkita Pass\b|余额|充值|订单支付|API Key|调用用量|团队管理)/i;
  if (forbiddenCopy.test(source) || forbiddenCopy.test(script)) fail("Phase 1 Hub UI contains a forbidden future capability");
}

const success = fixture("success");
for (const name of ["account", "marketplace", "entitlements"]) validateOkModule(success, name);
if (!/^.+\*+@.+$/.test(success.account?.data?.email_label || "")) fail("success fixture email_label must be masked");
if (!Array.isArray(success.marketplace?.data?.recent) || success.marketplace.data.recent.length > 3) fail("success fixture recent resources must be bounded to three");

const empty = fixture("empty");
for (const name of ["account", "marketplace", "entitlements"]) validateOkModule(empty, name);
if (empty.marketplace?.data?.acquired_count !== 0 || empty.marketplace?.data?.recent?.length !== 0) fail("empty fixture must model a normal zero-resource state");
if (empty.entitlements?.data?.active_count !== 0 || empty.entitlements?.data?.products?.length !== 0) fail("empty fixture must model a normal zero-entitlement state");

const partial = fixture("partial");
if (partial.account?.status !== "ok" || partial.entitlements?.status !== "ok" || partial.marketplace?.status !== "unavailable") {
  fail("partial fixture must degrade only the Marketplace module");
}
if (partial.marketplace?.error?.code !== "temporarily_unavailable" || partial.marketplace?.error?.retryable !== true) {
  fail("partial fixture must use the stable retryable module error");
}

const unauthorized = fixture("unauthorized");
if (unauthorized.status !== 401 || unauthorized.body?.error !== "authentication_required" || unauthorized.body?.login_url !== "/auth/login?return_to=%2Faccount") {
  fail("unauthorized fixture must return the safe frozen login response");
}

[success, empty, partial, unauthorized.body].forEach((payload) => inspectKeys(payload));

if (failures.length) {
  for (const message of failures) console.error(`[verify-hub] ${message}`);
  process.exitCode = 1;
} else {
  console.log("[verify-hub] OK: account page, 3 independent modules, 4 contract fixtures, storage and scope guards verified");
}
