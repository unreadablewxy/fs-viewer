import {app, BrowserWindow} from "electron";
import path from "path";

import {registerThumbnailProtocol} from "./thumbnail";

// Keep a global reference of the window object, if you don"t, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow | null;

function handleMainWindowClosed(): void {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
}

function createWindow(): void {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        frame: false,
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 400,
        backgroundColor: "#000000",
        webPreferences: {
            preload: path.join(app.getAppPath(), "build/api.js"),
        },
    });

    mainWindow.setMenu(null);

    // and load the index.html of the app.
    mainWindow.loadFile("build/index.html");

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    mainWindow.on("closed", handleMainWindowClosed);
}

function onReady(): void {
    createWindow();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", onReady);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    // On macOS it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null)
        createWindow();
});

registerThumbnailProtocol();