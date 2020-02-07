import {
    openDirectory,
    loadTagsIndex,
    loadFileTagIDs,
    saveFileTagIDs,
    saveTagNamespace,
} from "./files";
import {setMaximized, minimize, closeWindow} from "./window";
import {loadPreferences, savePreferences} from "./preferences";

const api = Object.freeze({
    openDirectory,
    loadTagsIndex,
    loadFileTagIDs,
    saveFileTagIDs,
    saveTagNamespace,

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
