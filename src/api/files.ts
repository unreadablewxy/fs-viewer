import {
    createReadStream,
    existsSync,
    Dirent,
    Stats,
    promises as afs,
} from "fs";
import {dirname, join as joinPath, normalize} from "path";
import readline from "readline";

import {getHomePath, loadPreferenceFile, rcFileName as preferencesFile} from "./preferences";

export {joinPath};

export function readDirectory(path: string): Promise<Dirent[]> {
    return afs.readdir(path, {withFileTypes: true});
}

export function getFileStat(path: string): Promise<Stats> {
    return afs.stat(path);
}

/**
 * The equivlent of Array.prototype.reduce that operates on a lines of a file
 * @param path 
 * @param visitor 
 * @param initial 
 * @returns 
 */
export function reduceTextFile<T>(
    path: string,
    visitor: (value: T, line: string) => boolean,
    initial: T,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const lineReader = readline.createInterface({
            input: createReadStream(path, {encoding: "utf8"}),
        });

        lineReader.on("close", () => {
            resolve(initial);
        });

        lineReader.on("line", line => {
            try {
                if (!visitor(initial, line))
                    lineReader.close();
            } catch (e) {
                lineReader.removeAllListeners();
                lineReader.close();
                reject(e);
            }
        });
    });
}

const tagsNSFile = ".tagnames";

/**
 * @param directory a directory in which to begin
 * @returns `directory` or a parent, that contains a namespace file
 */
export function findTagNamespaceFile(directory: string): string {
    const homePath = normalize(getHomePath());

    let p = normalize(directory);
    do {
        const tryPath = joinPath(p, tagsNSFile);
        if (existsSync(tryPath))
            return tryPath;

        const parent = dirname(p);
        if (parent === p) break;
        p = parent;
    } while (p !== homePath);

    return joinPath(directory, tagsNSFile);
}

/**
 * A specialized function meant to load all data necessary when changing the
 * working directory of the program
 * 
 * @param path the path the user is intending to open
 * @returns relevant information about the new working directory
 */
export async function openDirectory(path: string): Promise<OpenDirectoryResult> {
    const files = await readDirectory(path);

    const result: OpenDirectoryResult = {
        files: {
            path,
            names: [],
        },
        preferences: {},
    };

    let loadPrefsTask: Promise<Partial<Preferences>> | null = null;

    for (let n = 0; n < files.length; ++n) {
        const entry = files[n];
        if (entry.isFile()) {
            const fileName = entry.name;
            switch (fileName) {
            case preferencesFile:
                loadPrefsTask = loadPreferenceFile(joinPath(path, fileName));
                break;

            default:
                if (fileName[0] !== ".")
                result.files.names.push(fileName);
                break;
            }
        }
    }

    if (loadPrefsTask)
        result.preferences = await loadPrefsTask;

    return result;
}
