(function () {
  "use strict";

  // Presentation only: the session endpoint remains authoritative. Never cache
  // credentials, CSRF tokens, permissions or account-management links here.
  const key = "openakita.account-preview.v1";
  const maxAge = 30 * 60 * 1000;
  function restore() {
    const shell = document.querySelector("[data-account-shell]");
    if (!shell || !shell.querySelector("[data-account-status]")) return false;
    const node = (name) => shell.querySelector("[data-account-" + name + "]");
    const text = (value, limit) => typeof value === "string" ? value.slice(0, limit) : "";

    function clear() {
      try { sessionStorage.removeItem(key); } catch (_) {}
    }

    function save(authenticated) {
      const preview = { authenticated, savedAt: Date.now(), login: node("login").textContent };
      if (authenticated) {
        preview.name = node("name").textContent;
        preview.label = node("label").textContent;
        preview.initials = node("avatar-fallback").textContent;
        preview.avatar = node("avatar").hidden ? "" : node("avatar").getAttribute("src");
      }
      try { sessionStorage.setItem(key, JSON.stringify(preview)); } catch (_) {}
    }

    window.OpenAkitaAccountPreview = { save, clear };
    try {
      const preview = JSON.parse(sessionStorage.getItem(key));
      if (!preview || typeof preview.authenticated !== "boolean" ||
          !Number.isFinite(preview.savedAt) || Date.now() - preview.savedAt > maxAge ||
          preview.savedAt > Date.now()) {
        clear();
        return true;
      }
      node("login").textContent = text(preview.login, 80) || node("login").textContent;
      node("login").hidden = preview.authenticated;
      node("menu").hidden = !preview.authenticated;
      shell.dataset.state = preview.authenticated ? "preview" : "anonymous";
      if (!preview.authenticated) return true;
      node("name").textContent = text(preview.name, 200);
      node("label").textContent = text(preview.label, 200);
      node("avatar-fallback").textContent = text(preview.initials, 8);
      const avatar = text(preview.avatar, 2048);
      if (avatar && new URL(avatar).protocol === "https:") {
        node("avatar").setAttribute("src", avatar);
        node("avatar").hidden = false;
        node("avatar-fallback").hidden = true;
      }
    } catch (_) { clear(); }
    return true;
  }

  // This synchronous head script observes parsing. Mutation callbacks run
  // before rendering, so the completed account shell is restored before paint.
  if (!restore()) {
    const observer = new MutationObserver(() => {
      if (restore()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
