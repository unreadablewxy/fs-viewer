import {remote} from "electron";
import {existsSync, readdir, readFile, mkdir, writeFile} from "fs";
import {join as joinPath, sep as pathSeparator} from "path";
import {promisify} from "util";

const mkdirAsync = promisify(mkdir);
const readdirAsync = promisify(readdir);
const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

const defaultPreferences: Preferences = {
    columns: 6,
    order: 0,
    thumbnail: "system",
    thumbnailSizing: "cover",
    preload: 1,
    extensions: [],
};

export const rcFileName = ".viewerrc";

const configEncoding = "utf8";
const configRootPath = joinPath(remote.app.getPath("appData"), "fs-viewer");
const configFilePath = joinPath(configRootPath, "config.json");

async function writePreferences(
    value: Partial<Preferences>,
    path: string,
): Promise<void> {
    return writeFileAsync(path, JSON.stringify(value), configEncoding);
}

export async function loadPreferenceFile(
    path: string,
): Promise<Partial<Preferences>> {
    return readFileAsync(path, configEncoding).then(JSON.parse);
}

export async function savePreferences(value: Preferences): Promise<void>;
export async function savePreferences(value: Partial<Preferences>, directory: string): Promise<void>;
export async function savePreferences(
    value: Preferences | Partial<Preferences>,
    directory?: string,
): Promise<void> {
    let path: string;
    if (directory) {
        path = joinPath(directory, rcFileName);
    } else {
        directory = configRootPath;
        path = configFilePath;
    }

    return existsSync(directory)
        ? writePreferences(value, path)
        : mkdirAsync(directory, {recursive: true}).then(
            () => writePreferences(value, path));
}

const configLoadTask = loadPreferenceFile(configFilePath)
    .then(d => Object.assign({}, defaultPreferences, d))
    .catch(() => defaultPreferences);

export async function loadPreferences(): Promise<Preferences> {
    return configLoadTask;
}

export function getExtensionRoot(): string {
    return joinPath(remote.app.getPath("home"), ".fs-viewer-extensions") + pathSeparator;
}

export async function getExtensions(): Promise<string[]> {
    const paths = await readdirAsync(getExtensionRoot(), {withFileTypes: true});
    const result = new Array<string>();
    for (let n = 0; n < paths.length; ++n)
        if (paths[n].isDirectory())
            result.push(paths[n].name);

    return result;
}