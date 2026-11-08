// renderer/components/nav.js
export class Navigator {
  constructor(tabManager, urlInput, buttons) {
    this.tabManager = tabManager;
    this.urlInput = urlInput;
    this.backBtn = buttons.backBtn;
    this.forwardBtn = buttons.forwardBtn;
    this.reloadBtn = buttons.reloadBtn;
    this.newTabBtn = buttons.newTabBtn;
    this.setup();
  }

  setup() {
    if (this.newTabBtn) this.newTabBtn.addEventListener("click", () => this.tabManager.createTab());
    if (this.backBtn) this.backBtn.addEventListener("click", () => {
      const w = this.tabManager.getActiveWebView(); if (w && w.canGoBack) w.goBack();
    });
    if (this.forwardBtn) this.forwardBtn.addEventListener("click", () => {
      const w = this.tabManager.getActiveWebView(); if (w && w.canGoForward) w.goForward();
    });
    if (this.reloadBtn) this.reloadBtn.addEventListener("click", () => {
      const w = this.tabManager.getActiveWebView(); if (w) w.reload();
    });

    if (this.urlInput) this.urlInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      let raw = this.urlInput.value.trim();
      if (!raw) return;
      // Treat as search if no scheme
      let url = raw;
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) {
        url = "https://www.google.com/search?q=" + encodeURIComponent(raw);
      }
      const w = this.tabManager.getActiveWebView();
      if (w) {
        try { w.loadURL(url); } catch (err) { console.error(err); }
      }
    });
  }
}
