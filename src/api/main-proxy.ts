import {ipcRenderer} from "electron";
import type {FileFilter} from "electron/main";

import {WindowStatus} from "../main";
import {ChannelName, isFault, RequestType} from "../ipc.contract";

function createHandler<R, A extends unknown[] = []>(
    type: RequestType,
): (...args: A) => Promise<R> {
    return (...args: A) => ipcRenderer.invoke(ChannelName, type, ...args).
        then(r => isFault(r) ? Promise.reject(r) : r);
}

export const window = Object.seal({
    show:               createHandler(RequestType.WindowShow),
    close:              createHandler(RequestType.WindowClose),
    maximize:           createHandler(RequestType.WindowMaximize),
    minimize:           createHandler(RequestType.WindowMinimize),
    unmaximize:         createHandler(RequestType.WindowUnmaximize),
    getStatus:          createHandler<WindowStatus>(RequestType.WindowGetStatus),
    promptDirectory:    createHandler<string | false>(RequestType.WindowPromptDirectory),
    promptFile:         createHandler<string[] | false, [filter: FileFilter[], multi?: boolean]>(RequestType.WindowPromptFile),
});

export const fs = Object.seal({
    getAttr:        createHandler<ArrayBuffer, [path: string, name: string]>(RequestType.FileGetAttr),
    setAttr:        createHandler<void, [path: string, name: string, value: ArrayBuffer]>(RequestType.FileSetAttr),
    removeAttr:     createHandler<void, [path: string, name: string]>(RequestType.FileRemoveAttr),

    loadObject:     createHandler<Record<string, unknown>, [directory: string, file: string]>(RequestType.FileLoadObject),
    patchObject:    createHandler<void, [directory: string, file: string, patch: Record<string, unknown>]>(RequestType.FilePatchObject),

    loadText:       createHandler<string[], [path: string]>(RequestType.FileLoadText),
    patchText:      createHandler<void, [path: string, patch: Record<number, string>]>(RequestType.FilePatchText),

    flush:          createHandler<void, [directory: string]>(RequestType.FileFlush),
});