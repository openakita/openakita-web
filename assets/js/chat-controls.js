(function () {
  "use strict";
  const controls = new Map();
  let opened = null;
  const text = (key) => window.OpenAkitaChatI18n.t(key);

  function createControl(source, suggestions) {
    const wrapper = document.createElement("div");
    wrapper.className = "chat-choice" + (suggestions ? " chat-choice-editable" : "");
    source.before(wrapper);
    wrapper.append(source);
    const trigger = suggestions ? source : document.createElement("button");
    let caption;
    if (!suggestions) {
      source.hidden = true;
      trigger.type = "button";
      trigger.id = source.id + "-trigger";
      Array.from(source.labels || []).forEach((label) => { label.htmlFor = trigger.id; });
      trigger.className = "chat-choice-trigger";
      caption = document.createElement("span"); caption.className = "chat-choice-caption";
      const arrow = document.createElement("span"); arrow.className = "chat-choice-arrow"; arrow.setAttribute("aria-hidden", "true");
      trigger.append(caption, arrow); wrapper.append(trigger);
    } else {
      source.removeAttribute("list");
      source.autocomplete = "off";
      trigger.setAttribute("aria-autocomplete", "list");
      const arrow = document.createElement("span"); arrow.className = "chat-choice-arrow"; arrow.setAttribute("aria-hidden", "true"); wrapper.append(arrow);
    }
    const panel = document.createElement("div");
    panel.className = "chat-choice-panel";
    panel.id = source.id + "-choices";
    panel.setAttribute("popover", "manual");
    panel.setAttribute("role", "listbox");
    wrapper.append(panel);
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-controls", panel.id);
    trigger.setAttribute("aria-expanded", "false");
    let items = [], highlighted = -1, prefix = "", typedAt = 0;
    const optionSource = suggestions || source;

    function label() {
      const name = source.closest("label")?.querySelector("[data-chat-text], .visually-hidden")?.textContent.trim() || source.getAttribute("aria-label") || source.id;
      trigger.setAttribute("aria-label", name);
      panel.setAttribute("aria-label", name);
    }
    function position() {
      if (opened !== state) return;
      const rect = trigger.getBoundingClientRect();
      if (rect.bottom < 12 || rect.top > window.innerHeight - 12) { close(false); return; }
      const scrollContainer = trigger.closest(".chat-dialog-content");
      const visibleArea = scrollContainer?.getBoundingClientRect();
      if (visibleArea && (rect.bottom <= visibleArea.top || rect.top >= visibleArea.bottom)) { close(false); return; }
      const minimum = source.id === "active-endpoint" ? 320 : 160;
      const width = Math.min(Math.max(rect.width, minimum), window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 14;
      const above = rect.top - 14;
      const up = below < Math.min(panel.scrollHeight, 280) && above > below;
      const height = Math.max(40, Math.min(280, up ? above : below));
      panel.style.width = width + "px";
      panel.style.maxHeight = height + "px";
      panel.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) + "px";
      panel.style.top = (up ? rect.top - panel.getBoundingClientRect().height - 7 : rect.bottom + 7) + "px";
      panel.dataset.direction = up ? "up" : "down";
    }
    function highlight(index, scroll) {
      highlighted = index;
      Array.from(panel.querySelectorAll('[role="option"]')).forEach((row, rowIndex) => {
        row.dataset.highlighted = String(rowIndex === index);
        if (rowIndex === index) {
          trigger.setAttribute("aria-activedescendant", row.id);
          if (scroll) row.scrollIntoView({ block: "nearest" });
        }
      });
      if (index < 0) trigger.removeAttribute("aria-activedescendant");
    }
    function choose(index) {
      const item = items[index];
      if (!item || item.disabled) return;
      source.value = item.value;
      if (suggestions) source.dispatchEvent(new Event("input", { bubbles: true }));
      source.dispatchEvent(new Event("change", { bubbles: true }));
      close(true); sync();
    }
    function renderOptions() {
      const query = suggestions ? source.value.trim().toLowerCase() : "";
      items = Array.from(optionSource.options).filter((option) => !option.hidden && (!query || option.value.toLowerCase().includes(query))).map((option) => ({
        value: option.value, label: suggestions ? option.value : option.textContent.trim(), disabled: option.disabled,
      }));
      panel.replaceChildren();
      if (!items.length) {
        const empty = document.createElement("div"); empty.className = "chat-choice-empty";
        empty.textContent = text("noMatchingModels"); panel.append(empty);
      }
      items.forEach((item, index) => {
        const row = document.createElement("button"); row.type = "button";
        row.className = "chat-choice-option"; row.id = panel.id + "-" + index;
        row.setAttribute("role", "option"); row.setAttribute("aria-selected", String(item.value === source.value));
        row.disabled = item.disabled; row.tabIndex = -1;
        const value = document.createElement("span"); value.textContent = item.label;
        const check = document.createElement("span"); check.className = "chat-choice-check"; check.setAttribute("aria-hidden", "true");
        row.append(value, check);
        row.addEventListener("pointermove", () => { if (!item.disabled) highlight(index, false); });
        row.addEventListener("pointerdown", (event) => event.preventDefault());
        row.addEventListener("click", () => choose(index));
        panel.append(row);
      });
      const selected = items.findIndex((item) => item.value === source.value && !item.disabled);
      highlight(selected >= 0 ? selected : items.findIndex((item) => !item.disabled), false);
    }
    function close(focus) {
      if (opened !== state) return;
      panel.hidePopover(); opened = null;
      prefix = ""; typedAt = 0;
      trigger.setAttribute("aria-expanded", "false"); trigger.removeAttribute("aria-activedescendant");
      if (focus && !trigger.disabled) trigger.focus();
    }
    function show() {
      if (trigger.disabled || suggestions && !suggestions.options.length) return;
      if (opened && opened !== state) opened.close(false);
      renderOptions(); opened = state; panel.showPopover();
      trigger.setAttribute("aria-expanded", "true"); position(); highlight(highlighted, true);
    }
    function sync() {
      label();
      if (!suggestions) {
        caption.textContent = source.selectedOptions[0]?.textContent.trim() || "";
        trigger.disabled = source.disabled;
        trigger.title = caption.textContent;
      }
      if (opened === state) {
        if (trigger.disabled || suggestions && !suggestions.options.length) close(false);
        else { renderOptions(); position(); }
      }
    }
    function move(direction) {
      if (!items.length) return;
      let next = highlighted;
      for (let count = 0; count < items.length; count++) {
        next = (next + direction + items.length) % items.length;
        if (!items[next].disabled) { highlight(next, true); break; }
      }
    }
    const state = { source, trigger, panel, sync, close, show, position };
    controls.set(source, state);
    trigger.addEventListener("click", () => { if (suggestions) show(); else if (opened === state) close(false); else show(); });
    trigger.addEventListener("keydown", (event) => {
      if (event.isComposing) return;
      const isOpen = opened === state;
      if (event.key === "Escape" && isOpen) { event.preventDefault(); event.stopPropagation(); close(true); }
      else if (event.key === "Tab") close(false);
      else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault(); if (!isOpen) show(); else move(event.key === "ArrowDown" ? 1 : -1);
      } else if ((!suggestions && ["Home", "End"].includes(event.key))) {
        event.preventDefault(); if (!isOpen) show();
        const enabled = items.map((item, index) => item.disabled ? -1 : index).filter((index) => index >= 0);
        highlight(event.key === "Home" ? enabled[0] ?? -1 : enabled.at(-1) ?? -1, true);
      } else if (event.key === "Enter" || !suggestions && event.key === " ") {
        if (isOpen && highlighted >= 0) { event.preventDefault(); choose(highlighted); }
        else if (!suggestions) { event.preventDefault(); show(); }
      } else if (!suggestions && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); prefix = Date.now() - typedAt > 700 ? event.key.toLowerCase() : prefix + event.key.toLowerCase(); typedAt = Date.now();
        if (!isOpen) show();
        const match = items.findIndex((item) => !item.disabled && item.label.toLowerCase().startsWith(prefix));
        if (match >= 0) highlight(match, true);
      }
    });
    if (suggestions) {
      trigger.addEventListener("input", () => { if (document.activeElement === trigger) show(); });
      trigger.addEventListener("focus", show);
    }
    source.addEventListener("change", sync);
    new MutationObserver(sync).observe(optionSource, { subtree: true, childList: true, characterData: true, attributes: true });
    sync();
  }
  function enhance() {
    document.querySelectorAll(".web-chat select, .chat-dialog select").forEach((source) => { if (!controls.has(source)) createControl(source, null); });
    document.querySelectorAll("input[list]").forEach((source) => {
      const options = document.getElementById(source.getAttribute("list"));
      if (options && !controls.has(source)) createControl(source, options);
    });
  }
  let refreshScrollbar = () => {};
  function refresh() { controls.forEach((control) => control.sync()); refreshScrollbar(); }
  function setupDialogScrollbar() {
    const dialog = document.getElementById("endpoint-dialog");
    const viewport = document.getElementById("endpoint-dialog-content");
    const content = viewport?.querySelector(".chat-dialog-content-inner");
    const track = document.getElementById("endpoint-scrollbar");
    const thumb = document.getElementById("endpoint-scrollthumb");
    if (!dialog || !viewport || !content || !track || !thumb) return;
    let pending = false, drag = null;
    function update() {
      pending = false;
      const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      track.hidden = !dialog.open || maximum <= 1 || !viewport.clientHeight;
      thumb.setAttribute("aria-label", text("scrollEndpoints"));
      viewport.setAttribute("aria-label", text("endpointSettings"));
      if (track.hidden) return;
      const height = Math.min(track.clientHeight, Math.max(32, track.clientHeight * viewport.clientHeight / viewport.scrollHeight));
      const offset = (track.clientHeight - height) * Math.min(1, viewport.scrollTop / maximum);
      thumb.style.height = height + "px";
      thumb.style.transform = "translateY(" + offset + "px)";
      thumb.setAttribute("aria-valuenow", String(Math.round(viewport.scrollTop / maximum * 100)));
    }
    function schedule() { if (!pending) { pending = true; requestAnimationFrame(update); } }
    refreshScrollbar = schedule;
    viewport.addEventListener("scroll", schedule, { passive: true });
    const resize = new ResizeObserver(schedule); resize.observe(viewport); resize.observe(content);
    new MutationObserver(schedule).observe(content, { childList: true, characterData: true, subtree: true });
    new MutationObserver(() => {
      if (dialog.open) viewport.scrollTop = 0;
      schedule();
    }).observe(dialog, { attributes: true, attributeFilter: ["open"] });
    thumb.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault(); thumb.focus(); thumb.setPointerCapture(event.pointerId);
      drag = { y: event.clientY, top: viewport.scrollTop, maximum: viewport.scrollHeight - viewport.clientHeight, travel: track.clientHeight - thumb.clientHeight };
      thumb.dataset.dragging = "true";
    });
    thumb.addEventListener("pointermove", (event) => {
      if (drag?.travel > 0) viewport.scrollTop = drag.top + (event.clientY - drag.y) * drag.maximum / drag.travel;
    });
    function endDrag() { drag = null; delete thumb.dataset.dragging; }
    thumb.addEventListener("pointerup", endDrag);
    thumb.addEventListener("pointercancel", endDrag);
    thumb.addEventListener("lostpointercapture", endDrag);
    track.addEventListener("pointerdown", (event) => {
      if (event.target === thumb || event.button !== 0) return;
      event.preventDefault(); thumb.focus();
      const travel = track.clientHeight - thumb.clientHeight;
      if (travel > 0) viewport.scrollTop = (event.clientY - track.getBoundingClientRect().top - thumb.clientHeight / 2) / travel * (viewport.scrollHeight - viewport.clientHeight);
    });
    thumb.addEventListener("keydown", (event) => {
      const changes = { ArrowDown: 40, ArrowUp: -40, PageDown: viewport.clientHeight * 0.9, PageUp: -viewport.clientHeight * 0.9 };
      if (event.key === "Home") viewport.scrollTop = 0;
      else if (event.key === "End") viewport.scrollTop = viewport.scrollHeight;
      else if (changes[event.key] !== undefined) viewport.scrollTop += changes[event.key];
      else return;
      event.preventDefault(); event.stopPropagation();
    });
    dialog.addEventListener("close", endDrag);
    schedule();
  }
  document.addEventListener("pointerdown", (event) => {
    if (opened && !opened.panel.contains(event.target) && !opened.trigger.contains(event.target)) opened.close(false);
  }, true);
  document.addEventListener("focusin", (event) => {
    if (opened && !opened.panel.contains(event.target) && event.target !== opened.trigger) opened.close(false);
  });
  document.addEventListener("scroll", (event) => { if (opened && !opened.panel.contains(event.target)) opened.position(); }, true);
  window.addEventListener("resize", () => opened?.position());
  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("close", () => opened?.close(false)));
  document.addEventListener("openakita:language-changed", refresh);
  window.OpenAkitaChatControls = { refresh, show: (id) => controls.get(document.getElementById(id))?.show() };
  enhance();
  setupDialogScrollbar();
})();
