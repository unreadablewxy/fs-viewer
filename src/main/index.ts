import {app, BrowserWindow, BrowserWindowConstructorOptions} from "electron";
import {writeFileSync, readFile} from "fs";
import path from "path";

import {Debounce} from "../debounce";

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

interface WindowState extends Pick<BrowserWindowConstructorOptions, "x"|"y"|"width"|"height"> {
    maximized?: boolean;
}

let windowState: WindowState = {
    width: 800,
    height: 600,
};

const windowStateFilePath = path.join(
    app.getPath("appData"), "fs-viewer", "window-state.json");

const saveWindowState = new Debounce(function saveWindowState() {
    writeFileSync(windowStateFilePath, JSON.stringify(windowState));
    console.log("Saving window state");
}, 2000);

const loadStateTask = new Promise<void>((resolve) => {
    readFile(windowStateFilePath, { encoding:"utf-8" }, (err, data) => {
        if (!err) {
            try {
                windowState = Object.assign(windowState, JSON.parse(data));
            } catch (e) {
                // Ignore failures
            }
        }

        resolve();
    });
});

interface WindowEvent {
    sender: BrowserWindow
}

function handleWindowMove({sender}: WindowEvent) {
    windowState = sender.getBounds();
    windowState.maximized = sender.isMaximized();
    saveWindowState.schedule();
}

function createWindow(): void {
    const {maximized, ...optionsPatch} = windowState;

    mainWindow = new BrowserWindow({
        ...optionsPatch,
        frame: false,
        minWidth: 600,
        minHeight: 400,
        backgroundColor: "#000",
        show: false,
        paintWhenInitiallyHidden: true,
        webPreferences: {
            preload: path.join(app.getAppPath(), "build/api.js"),
            enableRemoteModule: true,
        },
    });

    mainWindow.setMenu(null);
    mainWindow.loadFile("build/index.html");

    if (maximized)
        mainWindow.maximize();

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    mainWindow.once("closed", handleMainWindowClosed);
    mainWindow.once("ready-to-show", () => {
        if (mainWindow) {
            mainWindow.on("move", handleWindowMove);
            mainWindow.on("resize", handleWindowMove);
            mainWindow.show();
        }
    });
}

function onReady(): void {
    Promise.all([loadStateTask, registerThumbnailProtocol()]).then(() => {
        createWindow();
    });
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