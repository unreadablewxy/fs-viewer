import {existsSync, promises as afs} from "fs";
import {join as joinPath, sep as pathSeparator} from "path";

import type {preference} from "..";
import type {RendererArguments} from "../ipc.contract";

export const defaultPreferences: preference.Set = {
    columns: 6,
    order: 0,
    thumbnail: "system",
    thumbnailSizing: "cover",
    thumbnailLabel: "full",
    preload: 1,
    extensions: [],
    lineupPosition: "bottom",
    lineupEntries: 3,
};

export const rcFileName = ".viewerrc";

const configEncoding = "utf8";

const [homePath, statePath] = process.argv.slice(process.argv.length - 2) as RendererArguments;
const configRoot = joinPath(statePath, "fs-viewer");
const configFilePath = joinPath(configRoot, "config.json");
const extensionRoot = joinPath(homePath, ".fs-viewer-extensions");

function writePreferences(
    value: Partial<preference.Set>,
    path: string,
): Promise<void> {
    return afs.writeFile(path, JSON.stringify(value), configEncoding);
}

export function loadPreferenceFile(
    path: string,
): Promise<Partial<preference.Set>> {
    return afs.readFile(path, configEncoding).then(JSON.parse);
}

export async function savePreferences(value: preference.Set): Promise<void>;
export async function savePreferences(value: Partial<preference.Set>, directory: string): Promise<void>;
export async function savePreferences(
    value: preference.Set | Partial<preference.Set>,
    directory?: string,
): Promise<void> {
    let path: string;
    if (directory) {
        path = joinPath(directory, rcFileName);
    } else {
        directory = configRoot;
        path = configFilePath;
    }

    if (!existsSync(directory))
        await afs.mkdir(directory, {recursive: true});

    return writePreferences(value, path);
}

export function loadPreferences(): Promise<preference.Set> {
    return loadPreferenceFile(configFilePath)
        .then(d => Object.assign({}, defaultPreferences, d))
        .catch(() => defaultPreferences);
}

export function getExtensionRoot(): string {
    return extensionRoot + pathSeparator;
}

export function getHomePath(): string {
    return homePath;
}

export async function getExtensions(): Promise<string[]> {
    const paths = await afs.readdir(getExtensionRoot(), {withFileTypes: true});
    const result = new Array<string>();
    for (let n = 0; n < paths.length; ++n)
        if (paths[n].isDirectory())
            result.push(paths[n].name);

    return result;
}