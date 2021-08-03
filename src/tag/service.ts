import {EventEmitter} from "events";

import {method} from "../interface";
import {Fault, ErrorCode, translateFault} from "../ipc.contract";
import {TagFilter, TagFilterProvider} from "./filter";

import type {Namespace, NamespaceID, TagID, Tags} from ".";
import type {BrowsingService} from "../browsing";
import type {Service as Reader} from "../reader";
import type {Service as Writer} from "../writer";

const namespaceMismatch = "Unable to set tags of a file from another namespace";
const attrTags = "user.tagids";
const fileTagsCache = ".tags-cache";
const tagsNSFileHeader = "#tags-namespace";

interface Properties {
    names: ReadonlyMap<number, string>;
    namespace: number;
}

// Think of the tagging service as a caching layer for file tag data
export interface TaggingService extends EventEmitter, Properties {
    createTag(name: string): Promise<TagID>;
    deleteTag(id: TagID): Promise<void>;
    renameTag(id: TagID, newName: string): Promise<void>;

    toggleFileTag(tag: TagID, fileName: string): Promise<void>;

    assignTag(tag: TagID, fileNames: ReadonlyArray<string>): Promise<void>;
    clearTag(tag: TagID, fileNames: ReadonlyArray<string>): Promise<void>;

    getFiles(id: TagID): Promise<Set<string>>;
    getUntaggedFiles(): Promise<Set<string>>;
    getTags(file: string): Promise<Tags>;

    on(event: "change", handler: () => void): this;
    on(event: "filechange", handler: (fileName: string, tags: Tags) => void): this;
}

export function create(
    reader: Reader,
    writer: Writer,
    findTagNamespaceFile: (directory: string) => string,
    browsing: BrowsingService,
): TaggingService {
    let workingDirectory: string;

    let ns: Readonly<Namespace>;
    let nsPath: string = "";

    let untagged: Set<string> | null = null;
    let files = new Map<string, Tags>();

    /**
     * Emits an incremental update to the tags cache file
     * @param patch the patch to send
     */
    function patchCache(patch: Record<string, TagID[] | null>): Promise<void | Fault> {
        return writer.patchObject(workingDirectory, fileTagsCache, patch);
    }

    /**
     * @param fileName Name of the file from which all tags should be removed
     */
    function clearFileTags(fileName: string): Promise<void> {
        if (untagged)
            untagged.add(fileName);

        const path = reader.joinPath(workingDirectory, fileName);
        return writer.removeAttr(path, attrTags).
            catch((e: Fault) => Promise.reject(
                new Error(translateFault("removing", "tags", e.code))));
    }

    /**
     * @param fileName Name of the file being updated
     * @param tags The tags to be saved on the file
     */
    function saveFileTags(fileName: string, tags: Tags): Promise<void> {
        const path = reader.joinPath(workingDirectory, fileName);

        const buffer = new ArrayBuffer((PLATFORM === "win32" ? 2 : 3) + tags.ids.size * 2);
        const data = new DataView(buffer);
        data.setUint16(0, tags.namespace, true);

        let n = 0;
        for (const tagID of tags.ids)
            data.setUint16(n += 2, tagID, true);

        return writer.setAttr(path, attrTags, buffer).
            catch((e: Fault) => Promise.reject(
                new Error(translateFault("saving", "tags", e.code))));
    }

    /**
     * @param fileName Name of the file whose tags are requested
     * @returns The tags attached to the file or null if it has none
     */
    async function loadFileTags(fileName: string): Promise<Tags | null> {
        const path = reader.joinPath(workingDirectory, fileName);

        const maybeData = await reader.getAttr(path, attrTags).
            catch((e: Fault) => e.code === ErrorCode.NotFound
                ? null
                : Promise.reject(e));

        if (!maybeData) return null;
        const data = new DataView(maybeData);

        const result: Tags = {
            namespace: data.getUint16(0, true),
            ids: new Set<TagID>(),
        };
    
        for (let n = 2; n < data.byteLength - 1; n += 2)
            result.ids.add(data.getUint16(n, true));

        return result;
    }

    /**
     * @param lines the lines of the namespace file
     * @returns the deserialized tags namespace
     */
    function parseTagNamespace(lines: string[]): Namespace {
        if (lines.length < 2 || lines[0] !== tagsNSFileHeader)
            throw new Error("Tags namespace file appears corrupted");

        const result: Namespace = {
            identifier: parseInt(lines[1], 16),
            names: new Map<number, string>(),
            nextId: 0,
        };

        let lineNum = 2;
        for (; lineNum < lines.length; ++lineNum) {
            const line = lines[lineNum].trim();
            const id = lineNum - 1;
            if (line)
                result.names.set(id, line);
            else if (!result.nextId)
                result.nextId = id;
        }

        if (!result.nextId)
            result.nextId = lineNum - 1;

        return result;
    }

    async function openTagsNamespace(path: string): Promise<Namespace> {
        try {
            const lines = await reader.loadTextFile(path);
            return parseTagNamespace(lines);
        } catch (e) {
            if (e.code === ErrorCode.NotFound) {
                const result = {
                    identifier: Math.ceil(Math.random() * 0xFFFF),
                    names: new Map(),
                    nextId: 1,
                };

                const lines = [tagsNSFileHeader, String(result.identifier)];
                await writer.patchTextFile(path, lines);
                return result;
            }

            throw new Error(translateFault("loading", "tags namespace", e.code));
        }
    }

    async function applyCache(cache: Record<string, unknown>, directory: string, namespace: NamespaceID): Promise<void> {
        const patch: Record<string, TagID[] | null> = {};

        for (const entry of await reader.readDirectory(directory)) {
            if (files.get(entry.name))
                continue;

            const cached = cache[entry.name];
            if (Array.isArray(cached)) {
                files.set(entry.name, {
                    namespace,
                    ids: new Set(cached),
                });

                delete cache[entry.name];
            }
        }

        for (const fileName of Object.keys(cache))
            patch[fileName] = null;

        patchCache(patch);
    }

    function onFilesChanged(): void {
        const newPath = browsing.files.path;
        if (workingDirectory === newPath)
            return;

        writer.flush(workingDirectory);

        const loadTagCacheTask = reader.loadObject(newPath, fileTagsCache);

        nsPath = findTagNamespaceFile(newPath);
        openTagsNamespace(nsPath).then(r => {
            files = new Map<string, Tags>();

            // avoid Promise.all, we can tolerate this one failing
            loadTagCacheTask.then(c => applyCache(c, newPath, r.identifier));

            untagged = null;
            workingDirectory = newPath;
            setNamespace(r);
        });
    }

    function setNamespace(newVal: Namespace): void {
        ns = newVal;
        service.emit("change");
    }

    function cloneNamespace(): Namespace {
        return {
            ...ns,
            names: new Map(ns.names.entries()),
        };
    }

    async function createTag(name: string): Promise<TagID> {
        const assignedId = ns.nextId;

        const updated = cloneNamespace();
        updated.names.set(assignedId, name);

        while (updated.names.has(++updated.nextId));
        setNamespace(updated);

        await writer.patchTextFile(nsPath, {[assignedId + 1]: name});
        return assignedId;
    }

    async function deleteTag(id: TagID): Promise<void> {
        const tasks = [];
        const patch: Record<string, TagID[] | null> = {};

        // Delete the tag from files first, fail results in retry
        // The other way around puts us in a bad state with dangling pointers
        for (const entry of await reader.readDirectory(workingDirectory))
            tasks.push(ensureTagCleared(id, entry.name, patch, true));

        tasks.push(patchCache(patch));
        await Promise.all(tasks);

        const updated = cloneNamespace();
        updated.names.delete(id);

        if (updated.nextId > id)
            updated.nextId = id;

        setNamespace(updated);
        await writer.patchTextFile(nsPath, {[id + 1]: ""});
    }

    async function renameTag(id: TagID, newName: string): Promise<void> {
        const updated = cloneNamespace();
        updated.names.set(id, newName);

        setNamespace(updated);
        await writer.patchTextFile(nsPath, {[id + 1]: newName});
    }

    async function getFileTags(fileName: string): Promise<Readonly<Tags>> {
        let tags = files.get(fileName);
        if (!tags) {
            const loaded = await loadFileTags(fileName);
            tags = files.get(fileName);

            // Check if we lost the race
            if (!tags) {
                tags = loaded || {
                    namespace: ns.identifier,
                    ids: new Set<TagID>(),
                };

                files.set(fileName, tags);
                patchCache({[fileName]: Array.from(tags.ids)});
            }
        }

        return tags;
    }

    // A callback that performs an update on a file's tags
    // WARNING: Though the callback returns a promise, it must not defer
    //          mutating the provided tags object. Failing to head this warning
    //          will lead to unexpected data loss
    type ChangeTags = (tags: Tags) => Promise<unknown>;

    async function updateFileTags(fileName: string, change: ChangeTags): Promise<void> {
        let tags = files.get(fileName);
        if (!tags) {
            const loaded = await loadFileTags(fileName);

            // If something else beat us to the punch, use their value
            tags = files.get(fileName) || loaded || {
                namespace: ns.identifier,
                ids: new Set<TagID>(),
            };
        }

        tags = {
            ...tags,
            ids: new Set(tags.ids),
        };

        const result = change(tags);
        files.set(fileName, tags);
        return result as Promise<void>;
    }

    function toggleFileTag(
        tag: TagID,
        file: string,
    ): Promise<void> {
        return updateFileTags(file, tags => {
            if (tags.namespace !== ns.identifier)
                throw new Error(namespaceMismatch);

            if (tags.ids.delete(tag)) {
                if (untagged && tags.ids.size < 1)
                    untagged.add(file);
            } else {
                tags.ids.add(tag);

                if (untagged)
                    untagged.delete(file);
            }

            service.emit("filechange", file, tags);
            if (tags.ids.size > 0) {
                return Promise.all([
                    saveFileTags(file, tags),
                    patchCache({[file]: Array.from(tags.ids.values())}),
                ]);
            }

            return Promise.all([
                clearFileTags(file),
                patchCache({[file]: null}),
            ]);
        });
    }

    function ensureTagAssigned(
        tag: TagID,
        fileName: string,
        patch: Record<string, TagID[] | null>,
    ): Promise<void> {
        return updateFileTags(fileName, tags => {
            if (tags.namespace !== ns.identifier)
                throw new Error(namespaceMismatch);

            const size = tags.ids.size;
            if (tags.ids.add(tag).size === size)
                return Promise.resolve();

            service.emit("filechange", fileName, tags);

            if (untagged)
                untagged.delete(fileName);

            patch[fileName] = Array.from(tags.ids.values());
            return saveFileTags(fileName, tags);
        });
    }

    function ensureTagCleared(
        id: TagID,
        fileName: string,
        patch: Record<string, TagID[] | null>,
        ignoreNsMismatch?: boolean,
    ): Promise<void> {
        return updateFileTags(fileName, tags => {
            if (tags.namespace !== ns.identifier)
                if (ignoreNsMismatch)
                    return Promise.resolve();
                else
                    throw new Error(namespaceMismatch);

            if (!tags.ids.delete(id))
                return Promise.resolve();

            service.emit("filechange", fileName, tags);

            if (tags.ids.size > 0) {
                patch[fileName] = Array.from(tags.ids.values());
                return saveFileTags(fileName, tags);
            }

            if (untagged)
                untagged.add(fileName);

            patch[fileName] = null;
            return clearFileTags(fileName);
        });
    }

    function assignTag(
        tag: TagID,
        fileNames: ReadonlyArray<string>,
    ): Promise<void> {
        const tasks = new Array<Promise<void>>();
        const patch: Record<string, TagID[] | null> = {};

        for (const file of fileNames)
            tasks.push(ensureTagAssigned(tag, file, patch));

        tasks.push(patchCache(patch) as Promise<void>);
        return Promise.all(tasks) as unknown as Promise<void>;
    }

    function clearTag(
        tag: TagID,
        fileNames: ReadonlyArray<string>,
    ): Promise<void> {
        const tasks = new Array<Promise<void>>();
        const patch: Record<string, TagID[] | null> = {};

        for (const file of fileNames)
            tasks.push(ensureTagCleared(tag, file, patch));

        tasks.push(patchCache(patch) as Promise<void>);
        return Promise.all(tasks) as unknown as Promise<void>;
    }

    async function getFiles(tag: TagID): Promise<Set<string>> {
        const result = new Set<string>();
        if (!ns) return result;

        for (const file of await reader.readDirectory(workingDirectory))
        {
            const tags = await getFileTags(file.name);
            if (tags.namespace === ns.identifier && tags.ids.has(tag))
                result.add(file.name);
        }

        return result;
    }

    function isTagsEmpty(tags: Tags): boolean {
        return tags.ids.size < 1;
    }

    async function getUntaggedFiles(): Promise<Set<string>> {
        if (!untagged) {
            const files = await reader.readDirectory(workingDirectory);
            const tasks = new Array<Promise<boolean>>(files.length);
            for (let n = 0; n < files.length; ++n)
                tasks[n] = getFileTags(files[n].name).then(isTagsEmpty);

            const index = new Set<string>();
            const fileHasNoTags = await Promise.all(tasks);
            for (let n = files.length; n --> 0;)
                if (fileHasNoTags[n])
                    index.add(files[n].name);

            untagged = index;
        }

        return untagged;
    }

    const service = Object.defineProperties(new EventEmitter() as TaggingService, {
        names: {
            configurable: false,
            get: () => ns.names,
        },

        namespace: {
            configurable: false,
            get: () => ns.identifier,
        },

        createTag: { ...method, value: createTag },
        deleteTag: { ...method, value: deleteTag },
        renameTag: { ...method, value: renameTag },

        toggleFileTag: { ...method, value: toggleFileTag },

        assignTag: { ...method, value: assignTag },
        clearTag: { ...method, value: clearTag },

        getFiles: { ...method, value: getFiles },
        getUntaggedFiles: { ...method, value: getUntaggedFiles },
        getTags: { ...method, value: getFileTags },
    });

    browsing.registerFilterProvider(TagFilter.TypeID, new TagFilterProvider(service));
    browsing.on("fileschange", onFilesChanged);

    return service;
}