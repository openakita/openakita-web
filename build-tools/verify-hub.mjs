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
  const forbidden = /^(?:access_token|refresh_token|id_token|authorization|cookie|raw_email|payment|orders?|team|api_key)$/i;
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

  if (count(source, 'data-hub-module="') !== 4) fail("account page must define exactly four Hub modules");
  for (const name of ["account", "marketplace", "entitlements", "pass"]) {
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
  if (count(script, "fetch(") !== 1) fail("Hub client must not call Account, Marketplace, or Pass directly");

  if (count(output, 'data-hub-module="') !== 4) fail("built account page must preserve four Hub modules");
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

  const forbiddenCopy = /(?:余额支付|冻结余额|确认扣款|订单支付|创建 API Key|团队管理)/i;
  if (forbiddenCopy.test(source) || forbiddenCopy.test(script)) fail("P2.1 Hub UI contains a forbidden write or payment capability");
}

const success = fixture("success");
for (const name of ["account", "marketplace", "entitlements", "pass"]) validateOkModule(success, name);
if (!/^.+\*+@.+$/.test(success.account?.data?.email_label || "")) fail("success fixture email_label must be masked");
if (!Array.isArray(success.marketplace?.data?.recent) || success.marketplace.data.recent.length > 3) fail("success fixture recent resources must be bounded to three");
if (success.pass?.data?.usage_available !== true) fail("success fixture must mark measured Pass usage as available");

const empty = fixture("empty");
for (const name of ["account", "marketplace", "entitlements", "pass"]) validateOkModule(empty, name);
if (empty.marketplace?.data?.acquired_count !== 0 || empty.marketplace?.data?.recent?.length !== 0) fail("empty fixture must model a normal zero-resource state");
if (empty.entitlements?.data?.active_count !== 0 || empty.entitlements?.data?.products?.length !== 0) fail("empty fixture must model a normal zero-entitlement state");
if (empty.pass?.data?.account_status !== "not_provisioned") fail("empty fixture must model Pass as not_provisioned, not unavailable");
if (empty.pass?.data?.usage_available !== false) fail("unprovisioned Pass fixture must not claim measured usage");

const partial = fixture("partial");
if (partial.account?.status !== "ok" || partial.entitlements?.status !== "ok" || partial.marketplace?.status !== "unavailable") {
  fail("partial fixture must degrade only the Marketplace module");
}
if (partial.marketplace?.error?.code !== "temporarily_unavailable" || partial.marketplace?.error?.retryable !== true) {
  fail("partial fixture must use the stable retryable module error");
}

const passPartial = fixture("pass-partial");
if (passPartial.account?.status !== "ok" || passPartial.marketplace?.status !== "ok" || passPartial.entitlements?.status !== "ok" || passPartial.pass?.status !== "unavailable") {
  fail("Pass partial fixture must degrade only the Pass module");
}
if (passPartial.pass?.error?.code !== "temporarily_unavailable" || passPartial.pass?.error?.retryable !== true) {
  fail("Pass partial fixture must use the stable retryable module error");
}

const unauthorized = fixture("unauthorized");
if (unauthorized.status !== 401 || unauthorized.body?.error !== "authentication_required" || unauthorized.body?.login_url !== "/auth/login?return_to=%2Faccount") {
  fail("unauthorized fixture must return the safe frozen login response");
}

[success, empty, partial, passPartial, unauthorized.body].forEach((payload) => inspectKeys(payload));

if (failures.length) {
  for (const message of failures) console.error(`[verify-hub] ${message}`);
  process.exitCode = 1;
} else {
  console.log("[verify-hub] OK: account page, 4 independent modules, 5 contract fixtures, storage and scope guards verified");
}
