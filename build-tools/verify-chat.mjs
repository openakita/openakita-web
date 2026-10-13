import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../assets/js/chat.js", import.meta.url), "utf8");
const providerSource = readFileSync(new URL("../assets/js/chat-provider.js", import.meta.url), "utf8");
const entry = readFileSync(new URL("../assets/js/chat-entry.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../assets/js/main.js", import.meta.url), "utf8");
const i18nSource = readFileSync(new URL("../assets/js/chat-i18n.js", import.meta.url), "utf8");
const languageWindow = {}, languageDocument = { documentElement: { lang: "en-US" } };
runInNewContext(i18nSource, { window: languageWindow, document: languageDocument });
const chatI18n = languageWindow.OpenAkitaChatI18n;
const languages = ["zh", "en", "ja", "ko", "ru", "fr", "de"];
assert.deepEqual(Object.keys(chatI18n.messages).sort(), languages.toSorted());
for (const language of languages) {
  const labels = chatI18n.messages[language];
  assert.deepEqual(Object.keys(labels).sort(), Object.keys(chatI18n.messages.en).sort(), `${language}: complete chat labels`);
  assert.deepEqual(Object.keys(labels.errors).sort(), Object.keys(chatI18n.messages.en.errors).sort(), `${language}: complete errors`);
  for (const [key, value] of Object.entries(labels)) {
    if (key === "errors") { for (const text of Object.values(value)) assert.ok(text.trim()); continue; }
    assert.ok(value.trim(), `${language}/${key}: nonempty`);
    assert.deepEqual(value.match(/\{\w+\}/g) || [], chatI18n.messages.en[key].match(/\{\w+\}/g) || [], `${language}/${key}: placeholders`);
  }
  languageDocument.documentElement.lang = language + "-test";
  assert.equal(chatI18n.language(), language);
  assert.equal(chatI18n.t("welcome"), labels.welcome);
  assert.equal(chatI18n.t("connectionName", { provider: "Claude" }), labels.connectionName.replace("{provider}", "Claude"));
}
for (const key of [...source.matchAll(/\bt\("(\w+)"/g)].map(match => match[1])) assert.ok(chatI18n.messages.en[key], `known runtime label ${key}`);
const detectLanguage = main.match(/function normalizeLanguageTag\([\s\S]*?\n  function resolvePageKey/)?.[0].replace(/\n  function resolvePageKey$/, "");
assert.ok(detectLanguage);
for (const language of languages) {
  for (const page of ["home", "chat"]) {
    const result = runInNewContext(detectLanguage + "\ndetectLanguage()", {
      SUPPORTED_LANGS: languages, document: { body: { dataset: { page } } },
      navigator: { languages: ["en-US"] }, localStorage: { getItem: key => key === "openakita_language" ? language : "en" },
    });
    assert.equal(result, language, `${page}: use shared ${language} preference`);
  }
}
assert.equal(runInNewContext(detectLanguage + "\ndetectLanguage()", { SUPPORTED_LANGS: languages, navigator: { languages: ["es-ES", "ja-JP"] }, localStorage: { getItem() { throw new Error("blocked"); } } }), "ja");
const switchLanguage = main.match(/function initLanguageSwitcher\(pageKey\) \{[\s\S]*?\n  function currentReturnPath/)?.[0].replace(/\n  function currentReturnPath$/, "");
assert.ok(switchLanguage);
const events = {}, selectionEvents = {}, writes = [], emitted = [];
const selection = { value: "", addEventListener: (key, fn) => { selectionEvents[key] = fn; } };
const switchContext = {
  currentLanguage: "en", SUPPORTED_LANGS: languages, LANG_TO_LOCALE: Object.fromEntries(languages.map(lang => [lang, lang])), languagePacks: Object.fromEntries(languages.map(lang => [lang, {}])),
  document: { documentElement: { lang: "en" }, querySelector: () => selection, dispatchEvent: event => emitted.push(event.type) },
  window: { addEventListener: (key, fn) => { events[key] = fn; } }, localStorage: { setItem: (...args) => writes.push(args) },
  CustomEvent: function(type) { this.type = type; }, normalizeLanguageTag: value => value, detectLanguage: () => "en",
};
for (const name of ["applyMeta", "applyCommonTexts", "applyPageTexts", "initLocalizedVideos", "applyHomeRevealStagger", "enhanceCodeBlocks", "applyImageTranslations", "applyContentTranslations", "applyCodeSampleTranslations"]) switchContext[name] = () => {};
runInNewContext(switchLanguage + '\ninitLanguageSwitcher("chat");', switchContext);
for (const language of languages) {
  events.storage({ key: "openakita_language", newValue: language });
  assert.equal(switchContext.document.documentElement.lang, language, `${language}: open tab synchronization`);
}
assert.equal(writes.length, 0, "storage synchronization does not overwrite preferences");
selection.value = "fr"; selectionEvents.change();
assert.deepEqual(writes, [["openakita_language", "fr"]]);
assert.ok(emitted.includes("openakita:language-changed"));
assert.doesNotMatch(main + source, /openakita_chat_language/);
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
  const providerWindow = {};
  runInNewContext(providerSource, { window: providerWindow, location: { hostname: host } });
  runInNewContext(i18nSource, { window: providerWindow, document });
  assert.equal(providerWindow.OpenAkitaChatProvider.isAllowedHost(host), allowed);
  if (!allowed) {
    runInNewContext(source, { document, window: providerWindow, location: { hostname: host }, fetch: async () => { fetches++; throw new Error("must not fetch"); } });
    assert.equal(gate.children[1].href, "https://openakita.ai/chat/");
    assert.equal(fetches, 0, `${host}: disabled before storage, setup or provider requests`);
  }
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
for (const provider of ["openai", "anthropic", "xai", "deepseek"]) assert.match(html, new RegExp(`value="${provider}"`));
assert.match(html, /data-i18n-managed/);
assert.match(source, /rememberKey && keys\.has\(id\) \? \{ apiKey: keys\.get\(id\) \}/);
assert.match(html, /id="endpoint-remember-key" type="checkbox" checked/);
assert.doesNotMatch(source, /innerHTML|eval\(/);
assert.doesNotMatch(source, /fetch\(|\/api\/v1\/chat/);
assert.match(html, /chat-provider\.js/);
assert.match(html, /chat-i18n\.js/);
assert.match(html, /chat-markdown\.js/);
assert.doesNotMatch(html, /id="chat-language"/);
assert.doesNotMatch(html, /id="(?:export-chat|delete-chat)"/);
assert.equal(readFileSync(new URL("../dist/assets/js/chat-i18n.js", import.meta.url), "utf8"), i18nSource);
assert.doesNotMatch(html, /__fixtures__|chat-provider-fixture/);
assert.equal(readFileSync(new URL("../dist/assets/js/chat-provider.js", import.meta.url), "utf8"), providerSource, "publish the production provider transport");
for (const directory of ["tools-temp", "tools-tmp", "runtime", "build-tools"]) assert.equal(existsSync(new URL("../dist/" + directory, import.meta.url)), false, "exclude private/diagnostic directory " + directory);
assert.doesNotMatch(providerSource, /localStorage|sessionStorage|\bconsole\.(?:log|warn|error|info|debug)\s*\(/);
const cn = readFileSync(new URL("../deploy/nginx/openakita.cn.conf", import.meta.url), "utf8");
assert.match(cn, /location \^~ \/chat\/ \{ return 404; \}/);
assert.match(cn, /location \^~ \/api\/v1\/chat\/ \{ return 404; \}/);
console.log("[verify-chat] OK: seven complete chat languages, shared preference and live synchronization, domain gates, homepage actions, providers and safe storage/rendering");
