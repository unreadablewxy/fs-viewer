import {EventEmitter} from "events";

import {Debounce} from "../debounce";

import {DeferredSaveCache} from "./cache";
import {TagFilter, TagFilterProvider} from "./filter";

import type {BrowsingService} from "../browsing";

const namespaceMismatch = "Unable to set tags of a file from another namespace";

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

    clearCache(tag: TagID): Promise<void>;

    on(event: "change", handler: () => void): this;
    on(event: "filechange", handler: (fileName: string, tags: Tags) => void): this;
}

export function create(api: API, browsing: BrowsingService): TaggingService {
    let workingDirectory: string;
    let ns: Readonly<TagNamespace>;
    let untagged: Set<string> | null = null;

    let files = new DeferredSaveCache<string, Tags>(
        async () => Promise.reject(),
        async () => Promise.reject());

    let indices = new DeferredSaveCache<TagID, Set<string>>(
        async () => Promise.reject(),
        async () => Promise.reject());

    const service: TaggingService = Object.defineProperties(new EventEmitter(), {
        names: {
            configurable: false,
            get: () => ns.names,
        },
        namespace: {
            configurable: false,
            get: () => ns.identifier,
        },
    });

    const save = new Debounce<void>(
        () => api.saveTagNamespace(workingDirectory, ns));

    function onFilesChanged(): void {
        const newPath = browsing.files.path;
        if (workingDirectory === newPath)
            return;

        api.openTagsNamespace(newPath).then(async r => {
            setNamespace(r);

            files = new DeferredSaveCache(
                async (file: string) => await api.loadFileTagIDs(newPath, file) || {namespace: r.identifier, ids: new Set()},
                (file: string, tags: Tags) => api.saveFileTagIDs(newPath, file, tags),
            );

            indices = new DeferredSaveCache(
                (tag: TagID) => api.loadTagsIndex(newPath, tag),
                (tag: TagID, files: Set<string>) => api.saveTagsIndex(newPath, tag, files),
            );

            untagged = null;
            workingDirectory = newPath;
        });
    }

    function setNamespace(newVal: TagNamespace): Promise<void> {
        ns = newVal;
        service.emit("change");
        return save.schedule();
    }

    function cloneNamespace(): TagNamespace {
        return {
            ...ns,
            names: new Map(ns.names.entries()),
        };
    }

    service.createTag = async function createTag(name: string): Promise<TagID> {
        const assignedId = ns.nextId;

        const updated = cloneNamespace();
        updated.names.set(assignedId, name);

        while (updated.names.has(updated.nextId))
            ++updated.nextId;

        await setNamespace(updated);
        return assignedId;
    };

    service.deleteTag = async function deleteTag(id: TagID): Promise<void> {
        // Delete the tag from files first, fail results in retry
        // The other way around puts us in a bad state with dangling pointers
        await api.deleteTag(workingDirectory, id);

        const updated = cloneNamespace();
        updated.names.delete(id);

        // Deleting a tag invalidates the untagged cache completely
        if (untagged)
            untagged = null;

        if (updated.nextId > id)
            updated.nextId = id;

        await setNamespace(updated);
    };

    service.renameTag = async function renameTag(id: TagID, newName: string): Promise<void> {
        const updated = cloneNamespace();
        updated.names.set(id, newName);
        await setNamespace(updated);
    };

    service.toggleFileTag = async function toggleFileTag(
        tag: TagID,
        file: string,
    ): Promise<void> {
        let index = await indices.getOrLoad(tag);
        index = new Set(index || []);

        try {
            let tags = await files.getOrLoad(file);
            if (tags.namespace !== ns.identifier)
                throw new Error(namespaceMismatch);

            tags = {
                namespace: ns.identifier,
                ids: new Set(tags.ids),
            };

            if (tags.ids.has(tag)) {
                tags.ids.delete(tag);
                index.delete(file);

                if (untagged && tags.ids.size < 1)
                    untagged.add(file);
            } else {
                tags.ids.add(tag);
                index.add(file);

                if (untagged)
                    untagged.delete(file);
            }

            service.emit("filechange", file, tags);
            files.set(file, tags);
        } finally {
            indices.set(tag, index);
        }
    };

    // TODO: extract commonalities between these two and the above
    service.assignTag = async function assignTag(
        tag: TagID,
        fileNames: ReadonlyArray<string>,
    ): Promise<void> {
        let index = await indices.getOrLoad(tag);
        index = new Set(index || []);

        try {
            for (const file of fileNames) {
                if (index.has(file)) // Nothing to do
                    continue;

                let tags = await files.getOrLoad(file);
                if (tags.namespace !== ns.identifier)
                    throw new Error(namespaceMismatch);

                tags = {
                    namespace: ns.identifier,
                    ids: new Set(tags.ids),
                };
                
                tags.ids.add(tag);
                index.add(file);

                if (untagged)
                    untagged.delete(file);

                service.emit("filechange", file, tags);
                files.set(file, tags);
            }
        } finally {
            indices.set(tag, index);
        }
    };

    service.clearTag = async function clearTag(
        tag: TagID,
        fileNames: ReadonlyArray<string>,
    ): Promise<void> {
        let index = await indices.getOrLoad(tag);
        index = new Set(index || []);

        try {
            for (const file of fileNames) {
                if (!index.has(file)) // Nothing to do
                    continue;

                let tags = await files.getOrLoad(file);
                if (tags.namespace !== ns.identifier)
                    throw new Error(namespaceMismatch);

                tags = {
                    namespace: ns.identifier,
                    ids: new Set(tags.ids),
                };

                tags.ids.delete(tag);
                index.delete(file);

                if (untagged && tags.ids.size < 1)
                    untagged.add(file);

                service.emit("filechange", file, tags);
                files.set(file, tags);
            }
        } finally {
            indices.set(tag, index);
        }
    };

    service.getFiles = function getFiles(tag: TagID): Promise<Set<string>> {
        return indices.getOrLoad(tag);
    };

    service.getUntaggedFiles = async function getUntaggedFiles(): Promise<Set<string>> {
        if (!untagged)
            untagged = await api.findUntaggedFiles(workingDirectory);

        return untagged;
    };

    service.getTags = function getTags(file: string): Promise<Tags> {
        return files.getOrLoad(file);
    };

    service.clearCache = async function clearCache(tag: TagID): Promise<void> {
        return api.clearTagIndex(workingDirectory, tag);
    };

    browsing.registerFilterProvider(TagFilter.TypeID, new TagFilterProvider(service));
    browsing.on("fileschange", onFilesChanged);

    return service;
}