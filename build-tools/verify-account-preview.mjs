import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../assets/js/account-preview.js", import.meta.url), "utf8");
function page(storage) {
  const nodes = Object.fromEntries(["login", "menu", "name", "label", "avatar", "avatar-fallback", "status"].map(name => [name, {
    textContent: name === "login" ? "Login" : "", hidden: name !== "avatar-fallback", attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key] || null; }
  }]));
  const shell = { dataset: { state: "loading" }, querySelector: selector => nodes[selector.slice(14, -1)] };
  const window = {};
  runInNewContext(source, { window, document: { querySelector: () => shell }, sessionStorage: storage, URL });
  return { nodes, shell, api: window.OpenAkitaAccountPreview };
}
let stored = null;
const storage = { getItem: () => stored, setItem: (_, value) => { stored = value; }, removeItem: () => { stored = null; } };
const first = page(storage);
assert.equal(first.shell.dataset.state, "loading");
Object.assign(first.nodes.name, { textContent: "Akita User" });
Object.assign(first.nodes.label, { textContent: "a***@example.com" });
Object.assign(first.nodes["avatar-fallback"], { textContent: "AU" });
first.api.save(true);
const second = page(storage);
assert.equal(second.shell.dataset.state, "preview");
assert.equal(second.nodes.login.hidden, true);
assert.equal(second.nodes.menu.hidden, false);
assert.equal(second.nodes.name.textContent, "Akita User");
assert.equal(second.nodes.label.textContent, "a***@example.com");
assert.deepEqual(Object.keys(JSON.parse(stored)).sort(), ["authenticated", "avatar", "initials", "label", "login", "name", "savedAt"]);
second.api.save(false);
const anonymous = page(storage);
assert.equal(anonymous.shell.dataset.state, "anonymous");
assert.equal(anonymous.nodes.login.hidden, false);
assert.equal(anonymous.nodes.menu.hidden, true);
anonymous.api.clear();
assert.equal(stored, null);
stored = JSON.stringify({ authenticated: true, savedAt: Date.now() - 31 * 60 * 1000 });
assert.equal(page(storage).shell.dataset.state, "loading");
assert.equal(stored, null);
stored = "invalid-json";
assert.doesNotThrow(() => page(storage));
assert.equal(stored, null);
assert.doesNotThrow(() => page({ getItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } }));
console.log("[verify-account-preview] OK: first visit, pre-paint identity, anonymous, logout, expiry and blocked storage");
