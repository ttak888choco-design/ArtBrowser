export class TabManager {
  constructor(tabBar, viewContainer) {
    this.tabBar = tabBar;
    this.viewContainer = viewContainer;
    this.tabs = [];
    this.activeId = null;
  }

  static STARTPAGE_URL = "startpage.html";

  createTab(url = TabManager.STARTPAGE_URL) {
    const id = "tab-" + Date.now();

    const tabEl = document.createElement("div");
    tabEl.className = "tab";
    tabEl.dataset.id = id;

    const titleSpan = document.createElement("span");
    titleSpan.className = "title";
    titleSpan.textContent = "Loading...";
    tabEl.appendChild(titleSpan);

    const closeBtn = document.createElement("span");
    closeBtn.className = "close-btn";
    closeBtn.textContent = "✕";
    tabEl.appendChild(closeBtn);

    this.tabBar.appendChild(tabEl);

    const webview = document.createElement("webview");
    webview.src = url;
    webview.style.display = "none";

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      const webviewPreloadPath = window.location.href.replace(/renderer\/index\.html.*$/, "webview-preload.js");
      webview.setAttribute("preload", webviewPreloadPath);
    }

    //更新
    webview.addEventListener("page-title-updated", (e) => {
      titleSpan.textContent = e.title;
    });

    webview.addEventListener("did-finish-load", async () => {
      try {
        const t = await webview.getTitle();
        if (t) titleSpan.textContent = t;
      } catch { }
    });

    // ポップアップ（window.open, target="_blank"）を新しいタブで開く
    webview.addEventListener("new-window", (e) => {
      e.preventDefault();
      if (e.url) {
        this.createTab(e.url);
      }
    });

    // 設定ページからの変更を検知（ハッシュ変更）
    webview.addEventListener("did-navigate-in-page", (e) => {
      console.log("did-navigate-in-page:", e.url);
      if (e.url && e.url.includes("settings.html") && e.url.includes("#")) {
        const hash = e.url.split("#")[1];
        const params = new URLSearchParams(hash);
        console.log("設定変更検知:", hash);

        // 色覚フィルター
        const filterType = params.get("filter");
        if (filterType) {
          console.log("色覚フィルター変更:", filterType);
          window.dispatchEvent(new CustomEvent("colorVisionFilterChanged", {
            detail: { filterType }
          }));
        }

        // カスタムフィルター
        const customFilter = params.get("customFilter");
        if (customFilter) {
          try {
            // URLSearchParamsは既にデコード済みなのでそのままJSON.parse
            const filterData = JSON.parse(customFilter);
            console.log("カスタムフィルター変更:", filterData);
            window.dispatchEvent(new CustomEvent("customFilterChanged", {
              detail: { filterData }
            }));
          } catch (err) {
            console.error("フィルター解析エラー:", err);
          }
        }

        const eyecareMode = params.get("eyecare");
        if (eyecareMode) {
          console.log("アイケアモード変更イベント発火:", eyecareMode);
          window.dispatchEvent(new CustomEvent("eyecareModeChanged", {
            detail: { mode: eyecareMode }
          }));
        }
      }
    });

    webview.addEventListener("ipc-message", (e) => {
      console.log("ipc-message受信:", e.channel, e.args);
      if (e.channel === "settings-changed" && e.args && e.args[0]) {
        const { type, value } = e.args[0];
        if (type === "eyecare") {
          window.dispatchEvent(new CustomEvent("eyecareModeChanged", {
            detail: { mode: value }
          }));
        } else if (type === "filter") {
          window.dispatchEvent(new CustomEvent("colorVisionFilterChanged", {
            detail: { filterType: value }
          }));
        } else if (type === "customFilter") {
          window.dispatchEvent(new CustomEvent("customFilterChanged", {
            detail: { filterData: value }
          }));
        }
      }
    });

    // タブ選択
    tabEl.addEventListener("click", () => this.activateTab(id));

    // タブ削除
    closeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.closeTab(id);
    });

    this.viewContainer.appendChild(webview);
    this.tabs.push({ id, tabEl, webview });

    this.activateTab(id);

    return { id, tabEl, webview };
  }

  activateTab(id) {
    this.activeId = id;
    this.tabs.forEach((t) => {
      const active = t.id === id;
      t.tabEl.classList.toggle("active", active);
      t.webview.style.display = active ? "flex" : "none";
    });
  }

  closeTab(id) {
    const idx = this.tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const t = this.tabs[idx];
    t.tabEl.remove();
    t.webview.remove();
    this.tabs.splice(idx, 1);

    if (this.tabs.length > 0) {
      const next = this.tabs[Math.max(0, idx - 1)];
      this.activateTab(next.id);
    } else {
      this.activeId = null;
    }
  }

  getActiveWebView() {
    const t = this.tabs.find((x) => x.id === this.activeId);
    return t ? t.webview : null;
  }
}
