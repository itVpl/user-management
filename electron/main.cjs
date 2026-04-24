const path = require("path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let mainWindow = null;
let browserWindow = null;

const normalizeUrl = (value) => {
  if (typeof value !== "string") return "https://gmail.com";
  const trimmed = value.trim();
  if (!trimmed) return "https://gmail.com";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
};

const createBrowserWindow = async (rawUrl) => {
  const targetUrl = normalizeUrl(rawUrl);
  let parsed;

  try {
    parsed = new URL(targetUrl);
  } catch {
    parsed = new URL("https://gmail.com");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are allowed.");
  }

  if (browserWindow && !browserWindow.isDestroyed()) {
    await browserWindow.loadURL(parsed.toString());
    if (browserWindow.isMinimized()) browserWindow.restore();
    browserWindow.show();
    browserWindow.focus();
    return { success: true };
  }

  browserWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    parent: mainWindow || undefined,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  browserWindow.on("closed", () => {
    browserWindow = null;
  });

  await browserWindow.loadURL(parsed.toString());
  return { success: true };
};

const closeBrowserWindow = () => {
  if (browserWindow && !browserWindow.isDestroyed()) {
    browserWindow.close();
    browserWindow = null;
  }
  return { success: true };
};

app.whenReady().then(async () => {
  await createMainWindow();

  ipcMain.handle("browser:open-window", async (_event, rawUrl) => {
    try {
      return await createBrowserWindow(rawUrl);
    } catch (error) {
      return { success: false, message: error.message || "Failed to open browser window." };
    }
  });

  ipcMain.handle("browser:close-window", () => {
    try {
      return closeBrowserWindow();
    } catch (error) {
      return { success: false, message: error.message || "Failed to close browser window." };
    }
  });

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
