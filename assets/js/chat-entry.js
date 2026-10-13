(function () {
  const host = window.location.hostname.toLowerCase();
  const enabled = ["openakita.ai", "www.openakita.ai", "localhost", "127.0.0.1", "[::1]"].includes(host);
  window.OpenAkitaChatEntry = { enabled: enabled };
  function update() {
    document.querySelectorAll("[data-chat-entry]").forEach(function (link) {
      link.hidden = !enabled;
    });
  }
  document.addEventListener("DOMContentLoaded", update);
  document.addEventListener("openakita:language-changed", update);
})();
