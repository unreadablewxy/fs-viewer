import {remote} from "electron";
import {
    createReadStream,
    createWriteStream,
    readdir,
    existsSync,
    mkdirSync,
    unlink,
    rmdir,
} from "fs";
import {dirname, join as joinPath, normalize} from "path";
import readline from "readline";
import {getAttr, setAttr, removeAttr} from "./attrs";
import {promisify} from "util";

import {loadPreferenceFile, rcFileName as preferencesFile} from "./preferences";

export {joinPath};

const readdirAsync = promisify(readdir);
const unlinkAsync = promisify(unlink);
const rmdirAsync = promisify(rmdir);

const tagsIndexDirectory = ".tags";

const tagsNSFileHeader = "#tags-namespace";

function assertValidTagID(id: number) {
    if (id < 1)
        throw Error(`Invalid tag ID ${id}`);
}

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

async function loadTagNamespace(path: string): Promise<TagNamespace> {
    let lineNum = 0;
    const result = await reduceTextFile<TagNamespace>(path, (r, line) => {
        switch (lineNum++) {
        case 0:
            if (line !== tagsNSFileHeader)
                throw new Error(`Bad header in namespace file: ${path}`);
            break;

        case 1:
            r.identifier = parseInt(line, 16);
            break;

        default: {
                const id = lineNum - 2;
                if (line)
                    r.names.set(id, line);
                else if (!r.nextId)
                    r.nextId = id;

                break;
            }
        }

        return true;
    }, {
        identifier: 0,
        names: new Map<number, string>(),
        nextId: 0,
    });

    if (!result.nextId)
        result.nextId = lineNum - 1;

    return result;
}

const tagsNSFile = ".tagnames";

function findTagNamespaceFile(directory: string): string | null {
    const homePath = normalize(remote.app.getPath("home"));

    let p = normalize(directory);
    do {
        const tryPath = joinPath(p, tagsNSFile);
        if (existsSync(tryPath))
            return tryPath;

        const parent = dirname(p);
        if (parent === p) break;
        p = parent;
    } while (p !== homePath);

    return null;
}

export function saveTagNamespace(directory: string, ns: TagNamespace): Promise<void> {
    return new Promise((resolve, reject) => {
        const filePath = findTagNamespaceFile(directory)
            || joinPath(directory, tagsNSFile);

        const stream = createWriteStream(filePath);
        stream.on("close", resolve);
        stream.on("error", reject);

        stream.write(tagsNSFileHeader);
        stream.write(`\n${ns.identifier.toString(16)}`);
        for (let id = 1, written = 0; written < ns.names.size; ++id) {
            stream.write("\n");

            const name = ns.names.get(id);
            if (name) {
                stream.write(name);
                ++written;
            }
        }

        stream.end();
    });
}

export function openTagsNamespace(path: string): Promise<TagNamespace> {
    const namespacePath = findTagNamespaceFile(path);
    if (!namespacePath)
        return Promise.resolve({
            identifier: Math.ceil(Math.random() * 0xFFFF),
            names: new Map(),
            nextId: 1,
        });

    return loadTagNamespace(namespacePath);
}

export async function openDirectory(path: string): Promise<OpenDirectoryResult> {
    const files = await readdirAsync(path, {withFileTypes: true});

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

function getTagsIndexPath(directory: string, id: number): string {
    return joinPath(directory, tagsIndexDirectory, id.toString(16));
}

const indexHeader = "#tags-index";

async function rebuildTagIndex(
    directory: string,
    id: TagID,
): Promise<Set<string>> {
    const files = await readdirAsync(directory, {withFileTypes: true});
    const tasks = new Array<Promise<Tags | null>>(files.length);
    for (let n = 0; n < files.length; ++n)
        tasks[n] = loadFileTagIDs(directory, files[n].name);

    const index = new Set<string>();
    const fileTagIds = await Promise.all(tasks);
    for (let n = 0; n < files.length; ++n) {
        const tags = fileTagIds[n];
        if (tags && tags.ids.has(id))
            index.add(files[n].name);
    }

    return index;
}

function writeTagsIndex(
    filePath: string,
    fileNames: Iterable<string>,
    flags: string = "w",
): Promise<void> {
    return new Promise((resolve, reject) => {
        const stream = createWriteStream(filePath, {encoding: "utf8", flags});
        stream.on("end", resolve);
        stream.on("error", reject);

        if (flags === "w")
            stream.write(indexHeader);

        for (const fileName of fileNames)
            stream.write(`\n${fileName}`);

        stream.end();
    });
}

export async function loadTagsIndex(directory: string, id: TagID): Promise<Set<string>> {
    assertValidTagID(id);

    const filePath = getTagsIndexPath(directory, id);
    if (existsSync(filePath)) {
        let lineNum = 0;
        return await reduceTextFile(filePath, (r, line) => {
            if (!lineNum++ && line !== indexHeader)
                throw new Error("Invalid index header detected");

            const trimmed = line.trim();
            if (line.length !== trimmed.length)
                r.delete(trimmed);
            else
                r.add(line);

            return true;
        }, new Set<string>());
    }

    const dirPath = joinPath(directory, tagsIndexDirectory);
    if (!existsSync(dirPath))
        mkdirSync(dirPath, {recursive: true});

    const index = await rebuildTagIndex(directory, id);
    writeTagsIndex(getTagsIndexPath(directory, id), index);
    return index;
}

export async function saveTagsIndex(directory: string, id: TagID, files: Set<string>): Promise<void> {
    assertValidTagID(id);

    const filePath = getTagsIndexPath(directory, id);
    return writeTagsIndex(filePath, files, "w");
}

async function checkFileUntagged(path: string): Promise<boolean> {
    try {
        const data = await getAttr(path, tagsAttribute);
        return data.length < 1;
    } catch (e) {
        // No data or not found both means no tags
        if (e.code === "ENODATA" || e.code === "ENOENT")
            return true;

        throw e;
    }
}

export async function findUntaggedFiles(directory: string): Promise<Set<string>> {
    const files = await readdirAsync(directory, {withFileTypes: true});
    const tasks = new Array<Promise<boolean>>(files.length);
    for (let n = 0; n < files.length; ++n)
        tasks[n] = checkFileUntagged(joinPath(directory, files[n].name));

    const index = new Set<string>();
    const fileHasNoTags = await Promise.all(tasks);
    for (let n = files.length; n --> 0;) {
        if (fileHasNoTags[n])
            index.add(files[n].name);
    }

    return index;
}

const tagsAttribute = "user.tagids";

export async function loadFileTagIDs(
    directory: string,
    file: string,
): Promise<Tags | null> {
    const path = joinPath(directory, file);
    let data: Buffer;

    try {
        data = await getAttr(path, tagsAttribute);
    } catch (e) {
        // No data or not found both means no tags
        if (e.code === "ENODATA" || e.code === "ENOENT")
            return null;

        return Promise.reject(e);
    }

    const result: Tags = {
        namespace: data.readUInt16LE(0),
        ids: new Set<TagID>(),
    };

    for (let n = 2; n < data.length; n += 2)
        result.ids.add(data.readUInt16LE(n));

    return result;
}

export function saveFileTagIDs(
    directory: string,
    file: string,
    tags: null | Tags,
): Promise<void> {
    const path = joinPath(directory, file);

    let result: Promise<void>;
    if (tags && tags.ids.size > 0) {
        const data = Buffer.allocUnsafe(2 + tags.ids.size * 2);
        data.writeUInt16LE(tags.namespace, 0);

        const it = tags.ids.values();
        for (let n = 2, id = it.next(); !id.done; id = it.next(), n += 2)
            data.writeUInt16LE(id.value, n);

        result = setAttr(path, tagsAttribute, data);
    } else {
        result = removeAttr(path, tagsAttribute);
    }

    return result;
}

async function ensureTagCleared(
    directory: string,
    fileName: string,
    id: TagID,
): Promise<void> {
    const tags = await loadFileTagIDs(directory, fileName);
    if (tags && tags.ids.delete(id))
        return saveFileTagIDs(directory, fileName, tags);
}

// TODO: this is the responsibility of the cache, move it there
export async function deleteTag(
    directory: string,
    tag: TagID,
): Promise<void> {
    assertValidTagID(tag);

    const files = await readdirAsync(directory, {withFileTypes: true});
    const tasks = new Array<Promise<void>>(files.length + 1);
    let n;
    for (n = 0; n < files.length; ++n)
        tasks[n] = ensureTagCleared(directory, files[n].name, tag);

    tasks[n] = clearTagIndex(directory, tag);

    return Promise.all<void>(tasks) as unknown as Promise<void>;
}

export async function clearTagIndex(
    directory: string,
    tag?: TagID,
): Promise<void> {
    let path = getTagsIndexPath(directory, tag || 0);

    if (tag) {
        if (existsSync(path))
            return unlinkAsync(path);
    } else {
        path = dirname(path);
        if (existsSync(path))
            return rmdirAsync(path, {recursive: true});
    }
}