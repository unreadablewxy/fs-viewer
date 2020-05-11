import {
    findUntaggedFiles,
    openDirectory,
    loadTagsIndex,
    loadFileTagIDs,
    saveFileTagIDs,
    saveTagNamespace,
    deleteTag,
    clearTagIndex,
    addTagToFiles,
    removeTagFromFiles,
} from "./files";
import {setMaximized, minimize, closeWindow} from "./window";
import {loadPreferences, savePreferences} from "./preferences";

const api = Object.freeze({
    findUntaggedFiles,
    openDirectory,
    loadTagsIndex,
    loadFileTagIDs,
    saveFileTagIDs,
    saveTagNamespace,
    deleteTag,
    clearTagIndex,
    addTagToFiles,
    removeTagFromFiles,

    setMaximized,
    minimize,
    closeWindow,

    loadPreferences,
    savePreferences,
});

declare global {
    type API = typeof api;
}

Object.defineProperty(window, "api", {
    value: api,
    configurable: false,
    writable: false,
    enumerable: true,
});
