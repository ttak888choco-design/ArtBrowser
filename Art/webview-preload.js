// webview-preload.js
// webview内のページ（settings.htmlなど）からホストプロセスへ通知するためのpreload
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ipc", {
  sendToHost: (channel, data) => {
    ipcRenderer.sendToHost(channel, data);
  }
});
