import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const dom = new JSDOM(read("chat/index.html"), { url: "https://openakita.ai/chat/", runScripts: "outside-only" });
const { window } = dom;
const document = window.document;
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event("close")); };
const exports = [];
window.Blob = Blob;
window.URL.createObjectURL = blob => { exports.push(blob.text()); return "blob:https://openakita.ai/test-export"; };
window.URL.revokeObjectURL = () => {};
window.HTMLAnchorElement.prototype.click = function () { assert.ok(this.download.endsWith(".md")); };
window.localStorage.setItem("openakita_web_chat_v1", JSON.stringify({ version: 1, endpoints: [], conversations: [
  { id: "first", title: "First conversation", messages: [{ role: "user", content: "Question one", status: "done" }, { role: "assistant", content: "Answer one", status: "done" }] },
  { id: "second", title: "Second conversation", messages: [{ role: "user", content: "Question two", status: "done" }, { role: "assistant", content: "Answer two", status: "done" }] },
] }));
for (const path of ["assets/js/chat-i18n.js", "dist/assets/js/chat-markdown.js", "assets/js/chat-provider.js", "assets/js/chat.js"]) window.eval(read(path));
const row = id => document.querySelector(`[data-conversation-id="${id}"]`);
const action = (id, state) => row(id).querySelector(`[data-state="${state}"]`);
assert.equal(document.querySelector("#export-chat,#delete-chat"), null, "topbar actions removed");
assert.equal(row("first").querySelector("button button"), null, "row controls are sibling buttons");
row("first").querySelector(".chat-conversation").click();
document.getElementById("chat-input").value = "Keep this draft";
action("second", "exportLabel").click();
const exported = await exports[0];
assert.match(exported, /Second conversation[\s\S]*Answer two/);
assert.doesNotMatch(exported, /First conversation|Answer one/);
assert.equal(row("first").querySelector(".chat-conversation").getAttribute("aria-pressed"), "true", "exporting another row does not change selection");
assert.match(document.getElementById("messages").textContent, /Answer one/);
assert.equal(document.getElementById("chat-input").value, "Keep this draft");

action("second", "deleteLabel").click();
assert.equal(document.getElementById("delete-conversation-name").textContent, "Second conversation");
document.getElementById("cancel-delete-chat").click();
assert.ok(row("second"), "cancel preserves target conversation");
action("second", "deleteLabel").click();
document.getElementById("confirm-delete-chat").click();
assert.equal(row("second"), null);
assert.ok(row("first"));
assert.match(document.getElementById("messages").textContent, /Answer one/, "deleting inactive row preserves active messages");
assert.equal(document.getElementById("chat-input").value, "Keep this draft");
assert.equal(JSON.parse(window.localStorage.getItem("openakita_web_chat_v1")).conversations.length, 1);

action("first", "deleteLabel").click();
document.getElementById("confirm-delete-chat").click();
assert.equal(document.getElementById("messages").textContent, "");
assert.equal(document.getElementById("chat-welcome").hidden, false);
assert.equal(document.getElementById("chat-input").value, "");
assert.equal(JSON.parse(window.localStorage.getItem("openakita_web_chat_v1")).conversations.length, 0);
dom.window.close();
console.log("[verify-chat-conversations] OK: per-row export/delete targets, cancellation, active conversation/draft preservation and empty-state recovery");
