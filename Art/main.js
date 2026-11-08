// main.js
const { app, BrowserWindow, ipcMain, Menu, clipboard } = require("electron");
const path = require("path");
const Store = require("electron-store");

// 設定スキーマとデフォルト値
const store = new Store({
  defaults: {
    colorVisionFilter: "none",  // none, protanopia, deuteranopia, tritanopia
    colorFilterIntensity: 0     // 0-100
  }
});

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  win.loadFile(
    path.join(__dirname, "renderer", "index.html")
  );
}

// 設定の読み書きIPCハンドラー
ipcMain.handle("get-settings", () => {
  return store.store;  // 全設定を返す
});

ipcMain.handle("get-setting", (event, key) => {
  return store.get(key);
});

ipcMain.handle("set-setting", (event, key, value) => {
  store.set(key, value);
  // メインウィンドウに設定変更を通知
  if (win && win.webContents) {
    win.webContents.send("settings-changed", { key, value });
  }
  return true;
});

// ===========================
// AI 要約 (Gemini API)
// ===========================
ipcMain.handle("ai-summarize", async (event, text) => {
  // APIキー取得: 環境変数 → electron-store の順でフォールバック
  const ai = new GoogleGenAI({ apiKey: "AIzaSyDdAwkKxtEK4U5iLSek7kRY9pnFy_BhPZY" });
  if (!apiKey) {
    throw new Error("Gemini APIキーが設定されていません。環境変数 GEMINI_API_KEY を設定するか、設定画面でAPIキーを入力してください。");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `以下のWebページの内容を日本語で分かりやすく要約してください。要点を箇条書きでまとめ、最後に全体の概要を2〜3文で記述してください:\n\n${text}`
          }]
        }]
      })
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`API応答エラー (${res.status}): ${errBody}`);
    }

    const data = await res.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("APIからの有効な応答なし");
    }
  } catch (err) {
    console.error("GeminiapiErrorhasoccurd:", err);
    throw err;
  }
});

app.whenReady().then(createWindow);

// ポップアップ（window.open, target="_blank"）を新しいタブで開く
app.on("web-contents-created", (event, contents) => {
  // webviewからのポップアップをハンドリング
  contents.setWindowOpenHandler(({ url }) => {
    // メインウィンドウのwebContentsにURLを送信
    if (win && win.webContents) {
      win.webContents.send("open-new-tab-from-context", url);
    }
    return { action: "deny" }; // 新しいウィンドウは開かない
  });

  // 右クリックメニュー
  contents.on("context-menu", (e, params) => {
    const linkURL = params.linkURL;

    const template = [];

    if (linkURL && linkURL.trim() !== "") {
      template.push({
        label: "新しいタブで開く",
        click: () => {
          contents.send("open-new-tab-from-context", linkURL);
        }
      });

      template.push({
        label: "リンクをコピー",
        click: () => clipboard.writeText(linkURL)
      });

      template.push({ type: "separator" });
    }

    const menu = Menu.buildFromTemplate(template);
    menu.popup(BrowserWindow.fromWebContents(contents));
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
