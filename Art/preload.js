// preload.js
const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // 既存のAPI
  onOpenNewTab: (callback) => ipcRenderer.on("open-new-tab-from-context", (e, url) => callback(url)),
  close: () => ipcRenderer.send("window-close"),
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  openExternal: (url) => shell.openExternal(url),

  // 設定API
  getSettings: () => ipcRenderer.invoke("get-settings"),
  getSetting: (key) => ipcRenderer.invoke("get-setting", key),
  setSetting: (key, value) => ipcRenderer.invoke("set-setting", key, value),
  onSettingsChanged: (callback) => ipcRenderer.on("settings-changed", (e, data) => callback(data)),

  // AI API
  aiSummarize: (text) => ipcRenderer.invoke("ai-summarize", text)
});
