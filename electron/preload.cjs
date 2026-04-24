const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openInAppBrowser: (url) => ipcRenderer.invoke("browser:open-window", url),
  closeInAppBrowser: () => ipcRenderer.invoke("browser:close-window"),
});
