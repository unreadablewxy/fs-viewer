import {openDirectoryPrompt, openFilePrompt} from "./dialog";
import {
    findUntaggedFiles,
    openDirectory,
    openTagsNamespace,
    joinPath,
    loadTagsIndex,
    loadFileTagIDs,
    reduceTextFile,
    saveTagsIndex,
    saveFileTagIDs,
    saveTagNamespace,
    deleteTag,
    clearTagIndex,
} from "./files";
import {setMaximized, minimize, closeWindow} from "./window";
import {
    loadPreferences,
    savePreferences,
    getExtensionRoot,
    getExtensions,
} from "./preferences";
import {createConnection as createIPCConnection} from "./ipc";

const api = Object.freeze({
    openDirectoryPrompt,
    openFilePrompt,

    findUntaggedFiles,
    openDirectory,
    openTagsNamespace,
    joinPath,
    loadTagsIndex,
    loadFileTagIDs,
    reduceTextFile,
    saveTagsIndex,
    saveFileTagIDs,
    saveTagNamespace,
    deleteTag,
    clearTagIndex,

    setMaximized,
    minimize,
    closeWindow,

    loadPreferences,
    savePreferences,
    getExtensionRoot,
    getExtensions,

    createIPCConnection,
});

declare global {
    type API = typeof api;

    interface Window {
        api?: API;
    }
}

window.api = api;