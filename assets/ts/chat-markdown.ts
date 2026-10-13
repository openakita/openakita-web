import { Marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/common";
import { createButton, setState } from "./chat-action-icons";

type RenderOptions = { streaming?: boolean };
declare global {
  interface Window {
    OpenAkitaChatMarkdown: { render(target: HTMLElement, text: string, options?: RenderOptions): void };
    OpenAkitaChatI18n: { t(key: string): string };
  }
}

const markdown = new Marked({ gfm: true, breaks: true, async: false });
const cache = new Map<string, DocumentFragment>();
const tags = ["p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "del", "s", "blockquote", "ul", "ol", "li", "hr", "pre", "code", "a", "img", "table", "thead", "tbody", "tr", "th", "td", "span", "input", "kbd", "sup", "sub"];

function fragmentFor(text: string, streaming: boolean): DocumentFragment {
  const cached = !streaming && cache.get(text);
  if (cached) return cached.cloneNode(true) as DocumentFragment;
  const fragment = DOMPurify.sanitize(markdown.parse(text, { async: false }), {
    ALLOWED_TAGS: tags,
    ALLOWED_ATTR: ["href", "title", "class", "src", "alt", "align", "type", "disabled", "checked", "start"],
    ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false, RETURN_DOM_FRAGMENT: true,
  });
  fragment.querySelectorAll("[class]").forEach(element => {
    const language = element.matches("pre > code") ? Array.from(element.classList).find(name => /^language-[\w+-]+$/.test(name)) : "";
    element.removeAttribute("class");
    if (language) element.className = language;
  });
  // Rebuild code from textContent before highlighting: model-provided HTML/classes
  // never become trusted highlighting output or alter the surrounding page.
  fragment.querySelectorAll<HTMLElement>("pre > code").forEach(code => {
    const languageClass = Array.from(code.classList).find(name => name.startsWith("language-"));
    const language = languageClass?.slice(9).toLowerCase() || "";
    const source = code.textContent || "";
    code.className = "hljs";
    code.textContent = source;
    let highlightedHTML = "";
    if (language && hljs.getLanguage(language)) {
      code.classList.add("language-" + language);
      if (source.length <= 30000) highlightedHTML = hljs.highlight(source, { language, ignoreIllegals: true }).value;
    } else if (language) code.dataset.language = language.slice(0, 40);
    else if (!streaming && source.length <= 10000) {
      const result = hljs.highlightAuto(source, ["javascript", "typescript", "python", "bash", "json", "sql", "xml", "css", "java", "go", "rust"]);
      if (result.language) { code.classList.add("language-" + result.language); highlightedHTML = result.value; }
    }
    if (highlightedHTML) code.replaceChildren(DOMPurify.sanitize(highlightedHTML, {
      ALLOWED_TAGS: ["span"], ALLOWED_ATTR: ["class"], RETURN_DOM_FRAGMENT: true,
    }));
  });
  fragment.querySelectorAll("a").forEach(link => {
    const href = link.getAttribute("href") || "";
    try { if (!href || !["https:", "http:", "mailto:"].includes(new URL(href, document.baseURI).protocol)) link.removeAttribute("href"); }
    catch (_) { link.removeAttribute("href"); }
    if (link.hasAttribute("href")) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
  });
  fragment.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src") || "";
    try { if (!src || !["https:", "http:"].includes(new URL(src, document.baseURI).protocol)) { img.remove(); return; } }
    catch (_) { img.remove(); return; }
    img.loading = "lazy"; img.referrerPolicy = "no-referrer";
  });
  fragment.querySelectorAll("input").forEach(input => {
    if (input.type !== "checkbox") input.remove();
    else { input.disabled = true; input.className = "chat-task-checkbox"; }
  });
  // Only completed messages enter the bounded cache; transient SSE prefixes do not.
  if (!streaming && text.length <= 20000) {
    if (cache.size >= 40) cache.delete(cache.keys().next().value!);
    cache.set(text, fragment.cloneNode(true) as DocumentFragment);
  }
  return fragment;
}

function render(target: HTMLElement, text: string, options: RenderOptions = {}): void {
  let fragment: DocumentFragment;
  try { fragment = fragmentFor(text, !!options.streaming); }
  catch (_) { target.textContent = text; return; }
  fragment.querySelectorAll("pre").forEach(pre => {
    const code = pre.querySelector("code");
    if (!code) return;
    const block = document.createElement("div"); block.className = "chat-code-block";
    const toolbar = document.createElement("div"); toolbar.className = "chat-code-toolbar";
    const label = document.createElement("span");
    label.textContent = Array.from(code.classList).find(name => name.startsWith("language-"))?.slice(9) || code.dataset.language || "text";
    const copy = createButton("copy");
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(code.textContent || ""); setState(copy, "copied"); }
      catch (_) { setState(copy, "failedCopy"); }
    });
    toolbar.append(label, copy); pre.before(block); block.append(toolbar, pre);
  });
  fragment.querySelectorAll("table").forEach(table => {
    const wrapper = document.createElement("div"); wrapper.className = "chat-table-scroll";
    wrapper.tabIndex = 0; table.before(wrapper); wrapper.append(table);
  });
  target.replaceChildren(fragment);
}

window.OpenAkitaChatMarkdown = Object.freeze({ render });
