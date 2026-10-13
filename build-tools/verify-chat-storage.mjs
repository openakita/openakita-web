import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../assets/js/chat.js", import.meta.url), "utf8");
const storageKey = "openakita_web_chat_v1";
const prefix = source.slice(0, source.indexOf("  function localize()"));
const remove = source.match(/  function removeEndpoint\(endpoint\) \{[\s\S]*?\n  \}/)?.[0];
const save = source.slice(source.indexOf('    $("endpoint-form").addEventListener("submit"'), source.indexOf('    $("load-models").addEventListener("click"'));
assert.ok(prefix && remove && save);

function page(storage, { blockedRead = false, blockedWrite = false, confirm = true } = {}) {
  const elements = Object.fromEntries(["chat-status", "endpoint-status", "endpoint-form", "endpoint-key", "endpoint-model", "endpoint-name", "endpoint-provider", "endpoint-remember-key", "active-endpoint", "endpoint-dialog", "chat-input"].map(id => [id, {
    value: "", checked: true, dataset: {}, textContent: "", listeners: {},
    addEventListener(name, fn) { this.listeners[name] = fn; }, close() {}, focus() {},
  }]));
  const window = {
    confirm: () => confirm,
    OpenAkitaChatProvider: { providers: Object.fromEntries(["openai", "anthropic", "xai", "deepseek"].map(provider => [provider, {}])) },
    OpenAkitaChatI18n: { messages: { en: { errors: {} } }, language: () => "en", t: key => key },
  };
  const context = { window, document: { getElementById: id => elements[id] }, crypto: { randomUUID: () => "new-connection" }, localStorage: {
    getItem: key => { assert.equal(key, storageKey); if (blockedRead) throw new Error("blocked"); return storage.value ?? null; },
    setItem: (key, value) => { assert.equal(key, storageKey); if (blockedWrite) throw new Error("quota"); storage.value = value; },
  } };
  runInNewContext(prefix + '\nfunction render() {}\nfunction resetEndpoint() {}\nfunction renderEndpointList() {}\n' + remove + '\n' + save + `
    window.test = { restore, persist, removeEndpoint,
      setEditing(id) { editingID = id; },
      state() { return { endpoints, conversations, keys: Array.from(keys), storageFailed, preferredEndpointID }; }
    };
  })();`, context);
  return { api: window.test, elements, save({ provider = "deepseek", key = "test-api-key", remember = true } = {}) {
    elements["endpoint-provider"].value = provider; elements["endpoint-key"].value = key;
    elements["endpoint-model"].value = "test-model"; elements["endpoint-name"].value = "Test connection";
    elements["endpoint-remember-key"].checked = remember;
    elements["endpoint-form"].listeners.submit({ preventDefault() {} });
  } };
}

for (const provider of ["openai", "anthropic", "xai", "deepseek"]) {
  const storage = {}, first = page(storage);
  first.save({ provider, key: "  test-remembered-key  " });
  const stored = JSON.parse(storage.value);
  assert.equal(stored.endpoints[0].provider, provider);
  assert.equal(stored.endpoints[0].apiKey, "test-remembered-key");
  assert.equal(stored.endpoints[0].rememberKey, true);
  assert.equal(stored.activeEndpointID, "new-connection", "remember the selected connection when saving");
  const reopened = page(storage); reopened.api.restore();
  assert.equal(reopened.api.state().keys[0][1], "test-remembered-key", `${provider}: restore key after page navigation/reload`);
  assert.equal(reopened.api.state().preferredEndpointID, "new-connection");
  reopened.api.setEditing("new-connection"); reopened.save({ provider, remember: false });
  assert.equal(reopened.api.state().keys[0][1], "test-api-key", "memory-only key remains available in current tab");
  assert.equal(Object.hasOwn(JSON.parse(storage.value).endpoints[0], "apiKey"), false, "opting out removes previously stored key");
  const memoryOnlyReopened = page(storage); memoryOnlyReopened.api.restore();
  assert.equal(memoryOnlyReopened.api.state().keys.length, 0);
  assert.equal(memoryOnlyReopened.api.state().endpoints[0].rememberKey, false);
}
const legacyEndpoint = { id: "legacy", provider: "openai", name: "Original", model: "original-model" };
const conversation = { id: "history", title: "Kept history", messages: [{ role: "user", content: "hello", status: "done" }] };
const legacy = { value: JSON.stringify({ version: 1, endpoints: [legacyEndpoint], conversations: [conversation] }) };
const legacyPage = page(legacy); legacyPage.api.restore();
assert.equal(legacyPage.api.state().endpoints[0].rememberKey, true, "old metadata defaults to remember when next saved");
assert.equal(legacyPage.api.state().keys.length, 0);
legacyPage.api.setEditing("legacy"); legacyPage.save({ provider: "openai" });
assert.equal(JSON.parse(legacy.value).endpoints[0].apiKey, "test-api-key");
legacyPage.api.removeEndpoint(legacyPage.api.state().endpoints[0]);
assert.equal(JSON.parse(legacy.value).endpoints.length, 0);
assert.equal(legacyPage.api.state().keys.length, 0);
assert.equal(JSON.parse(legacy.value).conversations[0].title, "Kept history", "deleting endpoint removes key but retains conversation");

const cancelStorage = {}, cancelled = page(cancelStorage, { confirm: false }); cancelled.save();
cancelled.api.removeEndpoint(cancelled.api.state().endpoints[0]);
assert.equal(JSON.parse(cancelStorage.value).endpoints.length, 1, "cancelled removal retains connection");
assert.equal(cancelled.api.state().keys.length, 1);

for (const invalidKey of [42, "", "\n", "bad\rkey", "x".repeat(4097)]) {
  const corrupted = page({ value: JSON.stringify({ version: 1, endpoints: [{ ...legacyEndpoint, apiKey: invalidKey }] }) });
  corrupted.api.restore(); assert.equal(corrupted.api.state().keys.length, 0, "ignore invalid stored key");
}
const optedOut = page({ value: JSON.stringify({ version: 1, endpoints: [{ ...legacyEndpoint, rememberKey: false, apiKey: "stale-key" }] }) });
optedOut.api.restore(); assert.equal(optedOut.api.state().keys.length, 0, "do not restore stale key when opted out");
for (const value of ["not-json", JSON.stringify({ version: 9 })]) {
  const corrupted = page({ value }); corrupted.api.restore(); assert.equal(corrupted.api.state().endpoints.length, 0);
}
const blocked = page({}, { blockedRead: true, blockedWrite: true });
blocked.api.restore(); blocked.save();
assert.equal(blocked.api.state().storageFailed, true);
assert.equal(blocked.api.state().keys.length, 1, "storage failures do not prevent current-tab use");
assert.equal(blocked.elements["chat-status"].dataset.chatText, "storageError");

const exporter = source.match(/  function exportConversation\(id\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(exporter); assert.doesNotMatch(exporter, /keys\.|apiKey|endpoints/);
console.log("[verify-chat-storage] OK: all providers restore remembered keys, memory-only opt-out, legacy data, key removal, blocked/corrupt storage and key-free exports");
