import { TabManager } from "./components/tab.js";
import { Navigator } from "./components/nav.js";

const tabBar = document.getElementById("tab-bar");
const viewContainer = document.getElementById("view-container");
const urlInput = document.getElementById("url");

const tabManager = new TabManager(tabBar, viewContainer);
new Navigator(tabManager, urlInput, {
  backBtn: document.getElementById("back"),
  forwardBtn: document.getElementById("forward"),
  reloadBtn: document.getElementById("reload"),
  newTabBtn: document.getElementById("new-tab")
});

// タブバー
document.getElementById("close").onclick = () => window.electronAPI.close();
document.getElementById("min").onclick = () => window.electronAPI.minimize();
document.getElementById("max").onclick = () => window.electronAPI.maximize();

// 初期タブ（スタートページを開く）
window.addEventListener("DOMContentLoaded", () => {
  tabManager.createTab();

  // 保存された色覚フィルターを復元
  const savedFilter = localStorage.getItem("colorVisionFilter");
  if (savedFilter && savedFilter !== "none") {
    if (savedFilter === "custom") {
      const customData = localStorage.getItem("customColorFilter");
      if (customData) {
        try {
          applyCustomColorFilter(JSON.parse(customData));
        } catch (err) {
          console.error("カスタムフィルター復元エラー:", err);
        }
      }
    } else {
      applyColorVisionFilter(savedFilter);
    }
  }
});

// ポップアップからの新規タブ
window.electronAPI.onOpenNewTab((url) => {
  tabManager.createTab(url);
});

// ===========================
// 設定変更イベントの監視
// ===========================

// 色覚フィルター変更
window.addEventListener("colorVisionFilterChanged", (e) => {
  const filterType = e.detail.filterType;
  console.log("色覚フィルター変更:", filterType);
  if (filterType) {
    localStorage.setItem("colorVisionFilter", filterType);
    if (filterType !== "custom") {
      localStorage.removeItem("customColorFilter");
    }
    applyColorVisionFilter(filterType);
  }
});

// カスタムフィルター変更
window.addEventListener("customFilterChanged", (e) => {
  const filterData = e.detail.filterData;
  console.log("カスタムフィルター変更:", filterData);
  if (filterData) {
    // app.js側のlocalStorageにも保存（起動時復元用）
    localStorage.setItem("customColorFilter", JSON.stringify(filterData));
    localStorage.setItem("colorVisionFilter", "custom");
    applyCustomColorFilter(filterData);
  }
});

// アイケアモード変更
window.addEventListener("eyecareModeChanged", (e) => {
  const mode = e.detail.mode;
  console.log("アイケアモード変更:", mode);
  if (mode) {
    setEyecareMode(mode);
  }
});

// サイドバー開閉
const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("sidebar-toggle");

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("expanded");
});

// ===========================
// 設定ボタン（歯車マーク）
// ===========================
const settingsToggle = document.getElementById("settings-toggle");

if (settingsToggle) {
  settingsToggle.addEventListener("click", () => {
    tabManager.createTab("settings.html");
  });
}

//通常
const colorFilterSlider = document.getElementById("color-filter-slider");
const colorFilterOverlay = document.getElementById("color-filter-overlay");

let currentColorVisionFilter = "none";
let eyecareActive = false;

function applyColorFilter(intensity) {
  const normalizedIntensity = intensity / 100;
  const maxOpacity = 0.35;
  const opacity = normalizedIntensity * maxOpacity;

  if (intensity === 0) {
    colorFilterOverlay.style.backgroundColor = "transparent";
  } else {
    colorFilterOverlay.style.backgroundColor = `rgba(255, 180, 100, ${opacity})`;
  }
}

if (colorFilterSlider && colorFilterOverlay) {
  colorFilterSlider.addEventListener("input", (e) => {
    applyColorFilter(parseInt(e.target.value, 10));
  });
  applyColorFilter(parseInt(colorFilterSlider.value, 10));
}

//インスタント版
const colorVisionFilters = {
  none: null,
  protanopia: `
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
      <filter id="protanopia-filter">
        <feColorMatrix type="matrix" values="
          0.2,  0.99, -0.19, 0, 0
          0.16, 0.79,  0.05, 0, 0
          0.01, -0.01, 1.00, 0, 0
          0,    0,     0,    1, 0
        "/>
      </filter>
    </svg>
  `,
  deuteranopia: `
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
      <filter id="deuteranopia-filter">
        <feColorMatrix type="matrix" values="
          0.33, 0.72, -0.05, 0, 0
          0.33, 0.69, -0.02, 0, 0
          -0.02, 0.03, 0.99, 0, 0
          0,    0,     0,    1, 0
        "/>
      </filter>
    </svg>
  `,
  tritanopia: `
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
      <filter id="tritanopia-filter">
        <feColorMatrix type="matrix" values="
          0.95, 0.05,  0,     0, 0
          0,    0.433, 0.567, 0, 0
          0,    0.475, 0.525, 0, 0
          0,    0,     0,     1, 0
        "/>
      </filter>
    </svg>
  `
};

let svgContainer = null;

function applyColorVisionFilter(filterType) {
  if (svgContainer) {
    svgContainer.remove();
    svgContainer = null;
  }

  const vc = document.getElementById("view-container");

  if (filterType === "none") {
    if (vc) vc.style.filter = eyecareActive ? "brightness(0.85)" : "";
    currentColorVisionFilter = "none";
  } else if (filterType === "custom") {
    // カスタムフィルターはlocalStorageから読み込む
    const customData = localStorage.getItem("customColorFilter");
    if (customData) {
      applyCustomColorFilter(JSON.parse(customData));
    }
  } else if (colorVisionFilters[filterType]) {
    svgContainer = document.createElement("div");
    svgContainer.innerHTML = colorVisionFilters[filterType];
    document.body.appendChild(svgContainer);

    let filter = `url(#${filterType}-filter)`;
    if (eyecareActive) {
      filter += " brightness(0.85)";
    }
    if (vc) vc.style.filter = filter;
    currentColorVisionFilter = filterType;
  }
}

// カスタムフィルター適用（診断結果から割り出したプロファイルの適用）
function applyCustomColorFilter(filterData) {
  if (svgContainer) {
    svgContainer.remove();
    svgContainer = null;
  }

  const vc = document.getElementById("view-container");
  if (!filterData) {
    if (vc) vc.style.filter = eyecareActive ? "brightness(0.85)" : "";
    currentColorVisionFilter = "none";
    return;
  }

  const { baseType, saturate, contrast, deltaEFactors } = filterData;
  let filterStr = "";

  svgContainer = document.createElement("div");
  let svgContent = "";

  // 1. Delta Eによる特定色強調マトリックスの動的生成
  if (deltaEFactors && (deltaEFactors.r > 0 || deltaEFactors.g > 0 || deltaEFactors.b > 0)) {
    const kr = deltaEFactors.r;
    const kg = deltaEFactors.g;
    const kb = deltaEFactors.b;

    // 対角成分(自身の色)を強化し、他の成分を減らすことで
    // 無彩色(グレー)の明るさを維持したまま特定色の彩度だけを上げる
    // 行1: R' = (1+kr)*R - (kr/2)*G - (kr/2)*B  → 赤が強調される
    // 行2: G' = -(kg/2)*R + (1+kg)*G - (kg/2)*B  → 緑が強調される
    // 行3: B' = -(kb/2)*R - (kb/2)*G + (1+kb)*B  → 青が強調される
    const m = [
      (1 + kr).toFixed(4), (-kr / 2).toFixed(4), (-kr / 2).toFixed(4), "0", "0",
      (-kg / 2).toFixed(4), (1 + kg).toFixed(4), (-kg / 2).toFixed(4), "0", "0",
      (-kb / 2).toFixed(4), (-kb / 2).toFixed(4), (1 + kb).toFixed(4), "0", "0",
      "0", "0", "0", "1", "0"
    ];
    const matrixStr = m.join(" ");

    console.log("Delta E 強調係数: R=" + kr.toFixed(3) + " G=" + kg.toFixed(3) + " B=" + kb.toFixed(3));
    console.log("生成マトリクス:", matrixStr);

    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none"><filter id="delta-e-filter"><feColorMatrix type="matrix" values="${matrixStr}"/></filter></svg>`;
    filterStr += "url(#delta-e-filter) ";
  } else if (baseType && baseType !== "none" && colorVisionFilters[baseType]) {
    // Delta Eデータがない場合は従来のフォールバック
    svgContent = colorVisionFilters[baseType];
    filterStr += `url(#${baseType}-filter) `;
  }

  if (svgContent) {
    svgContainer.innerHTML = svgContent;
    document.body.appendChild(svgContainer);
  }

  // 2. 全体彩度・コントラスト（後半スライダーテスト結果）
  if (saturate && saturate !== 100) {
    filterStr += `saturate(${saturate}%) `;
  }
  if (contrast && contrast !== 100) {
    filterStr += `contrast(${contrast}%) `;
  }

  // 3. アイケアモード
  if (eyecareActive) {
    filterStr += "brightness(0.85)";
  }

  if (vc) vc.style.filter = filterStr.trim();
  currentColorVisionFilter = "custom";
  console.log("カスタムフィルター適用:", filterStr.trim());
}

// ===========================
// アイケア
// ===========================
let eyecareMode = "off";
let eyecareOverlay = null;

function setEyecareMode(mode) {
  eyecareMode = mode;
  console.log("setEyecareMode実行:", mode);

  if (mode === "off") {
    eyecareActive = false;
    removeEyecareOverlay();
    updateViewContainerFilter();
  } else if (mode === "always") {
    eyecareActive = true;
    applyEyecareOverlay();
    updateViewContainerFilter();
  } else if (mode === "flash") {
    eyecareActive = false;
    removeEyecareOverlay();
    updateViewContainerFilter();
  }
}

function updateViewContainerFilter() {
  const vc = document.getElementById("view-container");
  if (!vc) return;

  let filter = "";
  if (currentColorVisionFilter !== "none") {
    filter = `url(#${currentColorVisionFilter}-filter)`;
  }
  if (eyecareActive) {
    filter += (filter ? " " : "") + "brightness(0.85)";
  }
  vc.style.filter = filter;
  console.log("view-container-filterupdate:", filter || "(なし)");
}

function applyEyecareOverlay() {
  if (eyecareOverlay) return;

  eyecareOverlay = document.createElement("div");
  eyecareOverlay.id = "eyecare-overlay";
  eyecareOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.1);
    pointer-events: none;
    z-index: 99999;
  `;
  document.body.appendChild(eyecareOverlay);
  console.log("EyeCareOverLay:Created");
}

function removeEyecareOverlay() {
  if (eyecareOverlay && eyecareOverlay.parentNode) {
    eyecareOverlay.parentNode.removeChild(eyecareOverlay);
    eyecareOverlay = null;
    console.log("EyeCareOverLay:Removed");
  }
}

window.setEyecareMode = setEyecareMode;
window.applyColorVisionFilter = applyColorVisionFilter;
window.tabManager = tabManager;

// ===========================
// AI アシスト機能
// ===========================

// 要約結果を新しいタブで表示
function showAISummaryPage(summaryText, originalUrl) {
  // Markdown風の記法を簡易HTMLに変換
  let formatted = summaryText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/\n/g, "<br>");

  // 連続する<li>をul/olで囲む
  formatted = formatted.replace(/((?:<li>.*?<\/li><br>?)+)/g, "<ul>$1</ul>");
  formatted = formatted.replace(/<br><\/ul>/g, "</ul>");

  const safeUrl = originalUrl ? originalUrl.replace(/"/g, "&quot;") : "";

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ページ要約</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', 'Hiragino Kaku Gothic ProN', sans-serif;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    color: #eee;
    min-height: 100vh;
    padding: 40px 20px;
  }
  .card {
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    padding: 36px 40px;
    max-width: 820px;
    margin: 0 auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .header-icon { font-size: 28px; }
  h1 {
    font-size: 22px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
  }
  .meta {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 28px;
    word-break: break-all;
  }
  .content {
    font-size: 15px;
    line-height: 1.85;
    color: rgba(255, 255, 255, 0.85);
  }
  .content strong {
    color: rgba(140, 200, 255, 0.95);
    font-weight: 600;
  }
  .content ul {
    list-style: none;
    padding-left: 0;
    margin: 12px 0;
  }
  .content li {
    padding: 6px 0 6px 20px;
    position: relative;
  }
  .content li::before {
    content: '▸';
    position: absolute;
    left: 0;
    color: rgba(140, 200, 255, 0.7);
  }
  .footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 11px;
    color: rgba(255, 255, 255, 0.3);
    text-align: center;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="header-icon">📝</span>
      <h1>ページ要約</h1>
    </div>
    <div class="meta">元ページ: ${safeUrl}</div>
    <div class="content">${formatted}</div>
    <div class="footer">Art Browser</div>
  </div>
</body>
</html>`;

  tabManager.createTab("data:text/html;charset=utf-8," + encodeURIComponent(html));
}

// 要約ボタン
const aiSummarizeBtn = document.getElementById("ai-summarize");
if (aiSummarizeBtn) {
  aiSummarizeBtn.addEventListener("click", async () => {
    const webview = tabManager.getActiveWebView();
    if (!webview) return;

    const btn = aiSummarizeBtn;
    const iconEl = btn.querySelector(".ai-btn-icon");
    const originalIcon = iconEl.textContent;
    btn.classList.add("loading");
    iconEl.textContent = "⏳";

    try {
      // 1. webviewからページのテキストを取得
      const pageText = await webview.executeJavaScript("document.body.innerText");

      if (!pageText || pageText.trim().length < 10) {
        alert("ページにテキストが見つかりません。");
        return;
      }

      // 2. テキストを15000文字に制限してメインプロセスへ送信
      const truncated = pageText.substring(0, 15000);
      const summary = await window.electronAPI.aiSummarize(truncated);

      // 3. 要約結果を新しいタブで表示
      let originalUrl = "";
      try { originalUrl = webview.getURL(); } catch (_) { }
      showAISummaryPage(summary, originalUrl);

    } catch (err) {
      console.error("AI要約エラー:", err);
      alert("要約の生成に失敗しました:\n" + (err.message || err));
    } finally {
      btn.classList.remove("loading");
      iconEl.textContent = originalIcon;
    }
  });
}

// ===========================
// テキスト背景色調節機能
// ===========================

function applyTextBackgroundColor(color) {
  const webview = tabManager.getActiveWebView();
  if (!webview) return;

  // HEX色から明るさを判定する関数 (YIQ計算)
  const isDarkColor = (hexColor) => {
    let hex = hexColor.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq < 128; // 128未満なら暗い色と判定
  };

  const isDark = isDarkColor(color);
  const textColorOverride = isDark ? 'color: #eeeeee !important;' : '';
  
  const linkOverride = isDark ? `
    body a:not(img):not(picture):not(svg):not(canvas):not(video):not(iframe),
    body a *:not(img):not(picture):not(svg):not(canvas):not(video):not(iframe) {
      color: #6cb0ff !important;
      text-decoration: underline !important;
    }
  ` : '';

  // ホスト側でCSS文字列を完全に構築する
  const cssString = `
    *:not(img):not(picture):not(svg):not(canvas):not(video):not(iframe) { 
      background-color: ${color} !important; 
      ${textColorOverride}
    }
    ${linkOverride}
  `;

  // JSON.stringifyでエスケープすることで、改行等が含まれていてもゲスト側での構文エラーを防ぐ
  const code = `
    (function() {
      let style = document.getElementById('art-bg-override');
      if (!style) {
        style = document.createElement('style');
        style.id = 'art-bg-override';
        document.head.appendChild(style);
      }
      style.textContent = ${JSON.stringify(cssString)};
    })();
  `;
  
  webview.executeJavaScript(code).catch(err => {
    console.error("背景色適用エラー:", err);
  });
}

function resetTextBackgroundColor() {
  const webview = tabManager.getActiveWebView();
  if (!webview) return;

  const code = `
    (function() {
      const style = document.getElementById('art-bg-override');
      if (style) {
        style.remove();
      }
    })();
  `;
  
  webview.executeJavaScript(code).catch(err => {
    console.error("背景色リセットエラー:", err);
  });
}

const applyBgColorBtn = document.getElementById("apply-bg-color");
const resetBgColorBtn = document.getElementById("reset-bg-color");
const colorPicker = document.getElementById("text-bg-color-picker");

const presetSepiaBtn = document.getElementById("preset-bg-sepia");
const presetDarkBtn = document.getElementById("preset-bg-dark");

if (applyBgColorBtn && colorPicker) {
  applyBgColorBtn.addEventListener("click", () => {
    applyTextBackgroundColor(colorPicker.value);
  });
}

if (resetBgColorBtn) {
  resetBgColorBtn.addEventListener("click", () => {
    resetTextBackgroundColor();
  });
}

// プリセット: セピア
if (presetSepiaBtn && colorPicker) {
  presetSepiaBtn.addEventListener("click", () => {
    const sepia = "#f4ecd8";
    colorPicker.value = sepia;
    applyTextBackgroundColor(sepia);
  });
}

// プリセット: ダーク
if (presetDarkBtn && colorPicker) {
  presetDarkBtn.addEventListener("click", () => {
    const dark = "#2d2d2d";
    colorPicker.value = dark;
    // ダークの場合は文字色が潰れる可能性があるため、専用のCSSを流し込む方がベターですが、
    // ここでは簡易的に色を適用します
    applyTextBackgroundColor(dark);
  });
}
