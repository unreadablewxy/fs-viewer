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

import {Cancellation} from "./error";
import {loadPreferenceFile, rcFileName as preferencesFile} from "./preferences";

const readdirAsync = promisify(readdir);
const unlinkAsync = promisify(unlink);
const rmdirAsync = promisify(rmdir);

const tagsIndexDirectory = ".tags";

const tagsNSFileHeader = "#tags-namespace";

function assertValidTagID(id: number) {
    if (id < 1)
        throw Error(`Invalid tag ID ${id}`);
}

function loadTagNamespace(path: string): Promise<TagNamespace> {
    return new Promise((resolve, reject) => {
        let lineReader = readline.createInterface({
            input: createReadStream(path),
        });

        let lineNum = 0;
        let result: TagNamespace = {
            identifier: 0,
            names: new Map<number, string>(),
            nextId: 0,
        };

        lineReader.on("close", () => {
            if (!result.nextId)
                result.nextId = lineNum - 1;

            resolve(result);
        });

        lineReader.on("line", line => {
            switch (lineNum++) {
            case 0:
                if (line !== tagsNSFileHeader) {
                    lineReader.removeAllListeners();
                    lineReader.close();
                    reject(new Error(`Bad header in namespace file: ${path}`));
                }
                break;

            case 1:
                result.identifier = parseInt(line, 16);
                break;

            default:
                const id = lineNum - 2;
                if (line)
                    result.names.set(id, line);
                else if (!result.nextId)
                    result.nextId = id;

                break;
            }
        });
    });
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

        let stream = createWriteStream(filePath);
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

export async function openDirectory(): Promise<OpenDirectoryResult> {
    const {canceled, filePaths} = await remote.dialog.showOpenDialog(
        remote.getCurrentWindow(),
        {
            properties: ["openDirectory"],
        });

    if (canceled)
        throw new Cancellation();

    const path = filePaths[0];
    const files = await readdirAsync(path, {withFileTypes: true});

    const result: OpenDirectoryResult = {
        files: {
            path,
            names: [],
        },
        tags: {
            identifier: Math.ceil(Math.random() * 0xFFFF),
            names: new Map(),
            nextId: 1,
        },
        preferences: {},
    };

    let loadPrefsTask: Promise<Partial<Preferences>> | null = null;
    let loadTagsNSTask: Promise<TagNamespace> | null = null;

    for (let n = 0; n < files.length; ++n) {
        const entry = files[n];
        if (entry.isFile()) {
            const fileName = entry.name;
            switch (fileName) {
            case preferencesFile:
                loadPrefsTask = loadPreferenceFile(joinPath(path, fileName));
                break;

            case tagsNSFile:
                loadTagsNSTask = loadTagNamespace(joinPath(path, fileName));
                break;

            default:
                if (fileName[0] !== ".")
                result.files.names.push(fileName);
                break;
            }
        }
    }

    if (loadTagsNSTask) {
        result.tags = await loadTagsNSTask;
    } else {
        const namespacePath = findTagNamespaceFile(path);
        if (namespacePath)
            result.tags = await loadTagNamespace(namespacePath);
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

export function loadTagsIndex(directory: string, id: TagID): Promise<Set<string>> {
    assertValidTagID(id);

    return new Promise((resolve, reject) => {
        const filePath = getTagsIndexPath(directory, id);
        if (existsSync(filePath)) {
            const lineReader = readline.createInterface({
                input: createReadStream(filePath, {encoding: "utf8"}),
            });

            let lineNum = 0;
            const result = new Set<string>();
            lineReader.on("close", () => resolve(result));
            lineReader.on("line", line => {
                if (!lineNum++ && line !== indexHeader) {
                    lineReader.removeAllListeners();
                    lineReader.close();
                    reject(new Error("Invalid index header detected"));
                }

                const trimmed = line.trim();
                if (line.length !== trimmed.length)
                    result.delete(trimmed);
                else
                    result.add(line);
            });
        } else {
            const dirPath = joinPath(directory, tagsIndexDirectory);
            if (!existsSync(dirPath))
                mkdirSync(dirPath, {recursive: true});

            rebuildTagIndex(directory, id).then(
                index => {
                    resolve(index);
                    writeTagsIndex(getTagsIndexPath(directory, id), index);
                },
                reject);
        }
    });
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

    let result: Tags = {
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
    changed: number[],
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

    for (let n = 0; n < changed.length; ++n) {
        const id = changed[n];
        const indexPath = getTagsIndexPath(directory, id);
        if (existsSync(indexPath)) {
            const value = tags && tags.ids.has(id) ? file : ` ${file}`;
            writeTagsIndex(indexPath, [value], "a");
        }
    }

    return result;
}

export async function addTagToFiles(
    directory: string,
    files: string[],
    namespaceID: NamespaceID,
    tag: TagID,
): Promise<void> {
    const tasks = new Array(files.length);
    for (let n = files.length; n --> 0;)
        tasks[n] = ensureTagSet(directory, files[n], namespaceID, tag);

    const indexPath = getTagsIndexPath(directory, tag);
    await Promise.all(tasks);
    if (existsSync(indexPath))
        await writeTagsIndex(indexPath, files, "a");
}

export function removeTagFromFiles(
    directory: string,
    files: string[],
    tag: TagID,
): Promise<void> {
    const tasks = new Array(files.length);
    for (let n = files.length; n --> 0;)
    tasks[n] = ensureTagCleared(directory, files[n], tag);

    return Promise.all(tasks) as unknown as Promise<void>;
}

async function ensureTagSet(
    directory: string,
    fileName: string,
    namespace: NamespaceID,
    id: TagID,
): Promise<void> {
    let tags = await loadFileTagIDs(directory, fileName);
    if (!tags)
        tags = {namespace, ids: new Set<number>()};

    if (tags.ids.size !== tags.ids.add(id).size)
        return saveFileTagIDs(directory, fileName, tags, []);
}

async function ensureTagCleared(
    directory: string,
    fileName: string,
    id: TagID,
): Promise<void> {
    const tags = await loadFileTagIDs(directory, fileName);
    if (tags && tags.ids.delete(id))
        return saveFileTagIDs(directory, fileName, tags, []);
}

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