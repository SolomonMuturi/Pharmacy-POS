// start.js

// Initialize remote and store
require("@electron/remote/main").initialize();
require("electron-store").initRenderer();

// Handle Squirrel events (Windows installer)
const setupEvents = require("./installers/setupEvents");
if (setupEvents.handleSquirrelEvent()) return;

// Start server
const server = require('./server');

// Electron modules
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const contextMenu = require("electron-context-menu");

// Native menu
let { Menu, template } = require("./assets/js/native_menu/menu");
const menuController = require('./assets/js/native_menu/menuController.js');

// Check if packaged
const isPackaged = app.isPackaged;

// Build and set menu
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

let mainWindow;

// Prevent multiple instances during squirrel events
if (require('electron-squirrel-startup')) app.quit();

// Function to create main window
function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width,
        height,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: false,
            contextIsolation: false,
        },
    });

    menuController.initializeMainWindow(mainWindow); 
    mainWindow.maximize();
    mainWindow.show();

    mainWindow.loadURL(`file://${path.join(__dirname, "index.html")}`);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

// Enable remote for all windows
app.on("browser-window-created", (_, window) => {
    require("@electron/remote/main").enable(window.webContents);
});

// App ready
app.whenReady().then(() => {
    createWindow();
    console.log("✅ POS app started");
});

// Quit app when all windows are closed (except macOS)
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

// macOS activate
app.on("activate", () => {
    if (mainWindow === null) createWindow();
});

// Global error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

// IPC events
ipcMain.on("app-quit", () => app.quit());
ipcMain.on("app-reload", () => mainWindow.reload());
ipcMain.on("restart-app", () => {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.quitAndInstall();
});

// Context menu with refresh
contextMenu({
    prepend: (params, browserWindow) => [
        {
            label: "Refresh",
            click() {
                mainWindow.reload();
            },
        },
    ],
});

// ⚡ Live reload during development
if (!isPackaged) {
    try {
        require("electron-reloader")(module);
        console.log("⚡ Electron live reload enabled");
    } catch (err) {
        console.warn("❌ Electron live reload failed", err);
    }
}
