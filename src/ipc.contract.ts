export const ChannelName = "ipc";

/**
 * Opcodes of all supported RPC requests
 */
export enum RequestType {
    // Not used, reserving 0 to detect serialization error
    Unsupported = 0,

    WindowShow,
    WindowClose,
    WindowMaximize,
    WindowUnmaximize,
    WindowMinimize,
    WindowGetStatus,
    WindowPromptDirectory,
    WindowPromptFile,

    FileRemoveAttr,
    FileSetAttr,
    FileGetAttr,
    FileLoadObject,
    FilePatchObject,
    FileLoadText,
    FilePatchText,
    FileFlush,
}

export type RendererArguments = [
    homePath: string,
    statePath: string,
];

export enum ErrorCode {
    Unexpected = 1,

    NotFound,
    IOError,
    DataFormat,
}

export interface Fault {
    code: ErrorCode;
}

export function isFault(v: unknown): v is Fault {
    return !!(v as Partial<Fault>)?.code;
}

export function createResponseHandler<T>(
    operation: string,
    resource: string,
): (v: T | Fault) => T {
    return function (v: T | Fault) {
        if (isFault(v))
            throw new Error(translateFault(operation, resource, v.code));
        else
            return v;
    }
}

export function translateFault(
    operation: string,
    resource: string,
    code: ErrorCode,
): string {
    switch (code) {
    case ErrorCode.NotFound:
        return `Unable to find ${resource}`;

    case ErrorCode.IOError:
        return `Unexpected IO error while ${operation} ${resource}`;

    default:
        return `Unexpected error while ${operation} ${resource}`;
    }
}

import {browsing, preference} from ".."; 

export interface OpenDirectoryResult {
    /**
     * The default view
     */
    files: browsing.FilesView;

    /**
     * Location specific preference overrides (if any)
     */
    preferences: Partial<preference.Set>;
}

import type {WindowStatus} from "./main";

export interface WindowService {
    on: typeof window.addEventListener;
    off: typeof window.removeEventListener;

    close(): void;
    maximize(): void;
    minimize(): void;
    unmaximize(): void;

    getStatus(): Promise<WindowStatus>;
}