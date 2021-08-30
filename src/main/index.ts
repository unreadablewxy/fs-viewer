import {app as runtime, ipcMain} from "electron";
import {join as joinPath} from "path";

import {ChannelName, RequestType} from "../ipc.contract";

import {CachedFileSystem} from "./file";
import {registerThumbnailProtocol} from "./thumbnail";
import {ClientWindow} from "./window";

export type {Status as WindowStatus} from "./window";

const fs = new CachedFileSystem();

const configRoot = joinPath(runtime.getPath("appData"), "fs-viewer");
const windowStatePath = joinPath(configRoot, "window-state.json");
const loadWinStateTask = fs.loadObject(windowStatePath);
let mainWindow: ClientWindow;

// Handlers have divergent arguments so any other type will be just as useless
type IPCHandler<R> = (...args: any[]) => R; // eslint-disable-line @typescript-eslint/no-explicit-any

const sharedHandlers: Partial<Record<RequestType, IPCHandler<unknown>>> = {
    [RequestType.WindowShow]:               () => loadWinStateTask.then(s => mainWindow.show(s)),

    [RequestType.FileSetAttr]:              fs.setAttribute.bind(fs),
    [RequestType.FileRemoveAttr]:           fs.removeAttribute.bind(fs),
    [RequestType.FileGetAttr]:              fs.getAttribute.bind(fs),

    [RequestType.FileLoadObject]:           fs.loadObject.bind(fs),
    [RequestType.FilePatchObject]:          fs.patchObject.bind(fs),

    [RequestType.FileLoadText]:             fs.loadTextFile.bind(fs),
    [RequestType.FilePatchText]:            fs.patchTextFile.bind(fs),

    [RequestType.FileFlush]:                fs.flush.bind(fs),
};

const dispatchedHandlers: Partial<Record<RequestType, IPCHandler<unknown>>> = {
    [RequestType.WindowClose]:              ClientWindow.prototype.close,
    [RequestType.WindowMaximize]:           ClientWindow.prototype.maximize,
    [RequestType.WindowUnmaximize]:         ClientWindow.prototype.unmaximize,
    [RequestType.WindowMinimize]:           ClientWindow.prototype.minimize,
    [RequestType.WindowGetStatus]:          ClientWindow.prototype.getStatus,
    [RequestType.WindowPromptDirectory]:    ClientWindow.prototype.openDirectoryPrompt,
    [RequestType.WindowPromptFile]:         ClientWindow.prototype.openFilePrompt,
};

ipcMain.handle(ChannelName, (ev, type, ...params) => {
    let handler = sharedHandlers[type as RequestType];
    if (handler)
        return handler(...params);

    handler = dispatchedHandlers[type as RequestType];
    if (handler)
        return handler.call(mainWindow, params);
    else
        console.error(`Unsupported RPC request id: ${type}`);
});

// Quit when all windows are closed.
runtime.on("window-all-closed", async function onAllWindowsClosed(): Promise<void> {
    await fs.flush();
    runtime.quit();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
runtime.on("ready", async function onReady(): Promise<void> {
    await registerThumbnailProtocol();
    mainWindow = new ClientWindow(s => fs.patchObject(windowStatePath, s));
});