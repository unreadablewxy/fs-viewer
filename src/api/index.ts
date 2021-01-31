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
import {getMaximzed, setMaximized, minimize, closeWindow} from "./window";
import {
    loadPreferences,
    savePreferences,
    getExtensionRoot,
    getExtensions,
} from "./preferences";
import {
    createIPCConnection,
    spawnChildProcess,
    Request,
} from "./ipc";

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

    getMaximzed,
    setMaximized,
    minimize,
    closeWindow,

    loadPreferences,
    savePreferences,
    getExtensionRoot,
    getExtensions,

    createIPCConnection,
    spawnChildProcess,
    Request,
});

declare global {
    type API = typeof api;

    interface Window {
        api?: API;
    }
}

window.api = api;