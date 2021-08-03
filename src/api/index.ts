import {contextBridge} from "electron";

import {
    joinPath,

    getFileStat,
    openDirectory,
    readDirectory,
    reduceTextFile,

    findTagNamespaceFile,
} from "./files";

import {
    createIPCConnection,
    createWorkerProcess,
    executeProgram,
} from "./ipc";

import {fs, window} from "./main-proxy";

import {
    loadPreferences,
    savePreferences,
    getExtensionRoot,
    getExtensions,
} from "./preferences";

function create() {
    return Object.freeze({
        joinPath,

        getFileStat,
        openDirectory,
        readDirectory,
        reduceTextFile,

        findTagNamespaceFile,

        fs,
        window,

        createIPCConnection,
        createWorkerProcess,
        executeProgram,

        loadPreferences,
        savePreferences,
        getExtensionRoot,
        getExtensions,
    });
}

let api: API | null = create();

function acquire(): API {
    const acquired = api;
    if (!acquired) {
        throw new Error("API already acquired by privileged code");
    }

    api = null
    return acquired;
}

declare global {
    type API = ReturnType<typeof create>;

    interface Window {
        api: {
            acquire(): API,
        },
    }
}

contextBridge.exposeInMainWorld("api", {acquire});
