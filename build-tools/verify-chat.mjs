import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../assets/js/chat.js", import.meta.url), "utf8");
const entry = readFileSync(new URL("../assets/js/chat-entry.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../assets/js/main.js", import.meta.url), "utf8");
const messagesMatch = main.match(/const MESSAGES = ([\s\S]*?);\s+function getNestedValue/);
assert.ok(messagesMatch, "site translations must be available");
const messages = runInNewContext("(" + messagesMatch[1] + ")");
const homeAction = main.match(/function applyHomePrimaryAction\(\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(homeAction, "homepage primary action must be available");
const chatLabels = { zh: "网页对话", en: "Web Chat", ja: "ウェブチャット", ko: "웹 채팅", ru: "Веб-чат", fr: "Chat en ligne", de: "Web-Chat" };
for (const host of ["openakita.cn", "www.openakita.cn", "openakita.ai.attacker.example", "unknown.example", "openakita.ai", "www.openakita.ai", "127.0.0.1", "localhost"]) {
  const allowed = ["openakita.ai", "www.openakita.ai", "localhost", "127.0.0.1"].includes(host);
  let fetches = 0;
  const gate = { children: [], textContent: "", replaceChildren(...children) { this.children = children; }, append(child) { this.children.push(child); } };
  const document = { documentElement: { lang: "en" }, getElementById: id => id === "chat-gate" ? gate : null, createElement: tag => ({ tag, textContent: "" }) };
  runInNewContext(source, { document, window: {}, location: { hostname: host }, fetch: async () => { fetches++; throw new Error("offline"); }, AbortSignal });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetches, allowed ? 1 : 0, `${host}: capability gate`);
  if (!allowed) assert.equal(gate.children[1].href, "https://openakita.ai/chat/");
  const links = [{ hidden: true }], listeners = {};
  const browserWindow = { location: { hostname: host } };
  runInNewContext(entry, { window: browserWindow, document: { documentElement: { lang: "en" }, querySelectorAll: () => links, addEventListener: (name, fn) => { listeners[name] = fn; } } });
  listeners.DOMContentLoaded(); assert.equal(links[0].hidden, !allowed, `${host}: navigation gate`);
  for (const [language, expectedLabel] of Object.entries(chatLabels)) {
    assert.equal(messages[language].home.hero.btnChat, expectedLabel, `${language}: explicit chat translation`);
    const icon = { src: "assets/img/icons/download.svg", alt: "download", setAttribute(key, value) { this[key] = value; } };
    function action(name, image) {
      return { name, href: "/download/", label: "立即下载", managed: false, getAttribute: () => name, setAttribute(key, value) { this[key] = value; }, querySelector: () => image };
    }
    const actions = [action("hero", icon), action("quickstart", null)];
    const translate = key => key.split(".").reduce((value, part) => value?.[part], messages[language]) ?? key.split(".").reduce((value, part) => value?.[part], messages.en);
    runInNewContext(homeAction + "\napplyHomePrimaryAction();", {
      window: browserWindow, document: { querySelectorAll: () => actions }, t: translate,
      setInlineLabel(selector, value) {
        const button = selector === "#downloadDesktopButton" ? actions[0] : actions.find(item => selector.includes('"' + item.name + '"'));
        assert.ok(button, "known homepage action"); button.label = value; button.managed = true;
      },
    });
    for (const button of actions) assert.equal(button.href, allowed ? "/chat/" : "/download/", `${host}/${language}/${button.name}: destination`);
    if (allowed) {
      for (const button of actions) assert.equal(button.label, expectedLabel, `${host}/${language}: chat copy`);
      assert.equal(icon.src, "/assets/img/icons/chat.svg"); assert.equal(icon.alt, "");
    } else {
      assert.equal(actions[0].label, translate("home.hero.btnDownload"));
      assert.equal(actions[1].label, "立即下载"); assert.equal(actions[1].managed, false, "domestic quickstart translation behavior is unchanged");
      assert.equal(icon.src, "assets/img/icons/download.svg"); assert.equal(icon.alt, "download");
    }
  }
}
const html = readFileSync(new URL("../dist/chat/index.html", import.meta.url), "utf8");
assert.match(html, /<html lang="en">/);
for (const provider of ["openai", "anthropic", "xai"]) assert.match(html, new RegExp(`value="${provider}"`));
assert.match(html, /data-i18n-managed/);
assert.match(source, /endpoints: endpoints\.map\(\(\{ id, provider, name, model \}\)/);
assert.doesNotMatch(source, /innerHTML|eval\(/);
const cn = readFileSync(new URL("../deploy/nginx/openakita.cn.conf", import.meta.url), "utf8");
assert.match(cn, /location \^~ \/chat\/ \{ return 404; \}/);
assert.match(cn, /location \^~ \/api\/v1\/chat\/ \{ return 404; \}/);
console.log("[verify-chat] OK: domain gates, seven-language homepage actions, domestic download preservation, providers and safe storage/rendering");
