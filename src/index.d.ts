import type {EventEmitter} from "events";
import type {Dirent, Stats} from "fs";

import type {
    Config as PipelineConfig,
    Provider as PipelineStageProvider,
    Stage as PipelineStage,
} from "./pipeline";

export namespace browsing {
    interface FilesView {
        /**
         * The path of the directory
         */
        path: string;

        /**
         * Names of files relative to `path`
         */
        names: string[];
    }

    /**
     * A stateful visitor is one that keeps state between invocations of its visit
     * function. These type allows one to keep data within or between invocations.
     */
    interface StatefulVisitor extends PipelineStage {
        begin?(): void;
        end?(): void;
    }

    export interface Filter extends StatefulVisitor {
        filter(files: FilesView): FilesView;
    }

    export interface Comparer extends StatefulVisitor {
        compare(workingDirectory: string, first: string, second: string): number;
    }

    export type FilterConfig = PipelineConfig;

    export type ComparerConfig = PipelineConfig;

    export type FilterProvider = PipelineStageProvider<FilterConfig, Filter>;

    export type ComparerProvider = PipelineStageProvider<ComparerConfig, Comparer>;

    export interface ServiceProperties {
        readonly files: FilesView;
        readonly selected: Set<number>;
        readonly filters: ReadonlyArray<FilterConfig>;
        readonly comparers: ReadonlyArray<ComparerConfig>;
        readonly focusedFile: number | null;
    }

    /**
     * Serving as the source of truth of what content is shown in what order, the
     * browsing service allows other components to tell it what are the filtering
     * and sorting parameters
     */
    export interface Service extends EventEmitter, ServiceProperties {

        addFilter(filter: FilterConfig): Promise<number>;
        removeFilter(id: number): void;
        registerFilterProvider(type: string, provider: FilterProvider): void;

        addComparer(comparer: ComparerConfig): Promise<number>;
        removeComparer(id: number): void;
        registerComparerProvider(type: string, provider: ComparerProvider): void;

        addSelection(start: number, end: number): void;
        clearSelection(): void;
        removeSelection(start: number, end: number): void;

        setFocus(index: number | null): void;

        getSelectedNames(): string[] | null;

        on(event: "fileschange", cb: () => void): this;
        on(event: "selectchange", cb: () => void): this;
        on(event: "filefocus", cb: (index: number | null) => void): this;
    }
}

export namespace io {
    export interface Writer {
        /**
         * Sets an attribute on a file
         * @param path The full path to the file
         * @param name The name of the attribute
         * @param value The value to set on the file
         */
        setAttr(path: string, name: string, value: ArrayBuffer): Promise<void>;

        /**
         * Removes an attribute from a file
         * @param path The full path to the file
         * @param name The name of the attribute
         */
        removeAttr(path: string, name: string): Promise<void>;

        /**
         * Equivalent to performing `Object.assign(FILE_ON_DISK, patch)`
         * @param path The full path to the file
         * @param patch The changes to apply keyed by property name
         */
        patchObject(path: string, patch: Record<string, unknown>): Promise<void>;

        /**
         * Given that the specified file is split on new lines, assign new
         * values to the specified lines
         * @param path The full path to the file
         * @param patch The changes to apply keyed by line number
         */
        patchTextFile(path: string, patch: Record<number, string>): Promise<void>;

        /**
         * Request that all data be evicted out of the cache, useful for when a
         * directory is no longer opened
         *
         * @param directory The path of the directory to flush
         */
        flush(directory: string): Promise<void>;
    }

    export interface Reader {
        joinPath(...parts: string[]): string;

        getStat(path: string): Promise<Stats>;
        readDirectory(path: string): Promise<ReadonlyArray<Dirent>>;

        getAttr(path: string, name: string): Promise<ArrayBuffer>;
        loadObject(path: string): Promise<Record<string, unknown>>;
        loadTextFile(path: string): Promise<string[]>;

        /**
         * Visits each line of a (possibly large) text file, updating a value
         * @param path The full path to the file
         * @param visitor The function to call per line of the file.
         *      Stops if returns false
         * @param initial The initial value passed into he reduction algorithm
         */
        reduceTextFile<T>(
            path: string,
            visitor: (value: T, line: string) => boolean,
            initial: T,
        ): Promise<T>;
    }
}

export namespace ipc {
    export interface RPCProxy {
        call(payload: Uint8Array): Promise<Uint8Array>;
        close(): void;
    }

    export interface ProcessResult {
        status: number;
        out: string;
        err: string;
    }

    // Called when the other side of the IPC socket initiates a message
    export type Listener = (data: Uint8Array) => Promise<Uint8Array>;

    export interface Service {
        connect(
            socketPath: string,
            disconnect?: () => void,
            listener?: Listener,
        ): Promise<RPCProxy>;

        spawn(
            executablePath: string,
            listener?: Listener,
            ...argv: string[]
        ): Promise<RPCProxy>;

        execute(executablePath: string, ...argv: string[]): Promise<ProcessResult>;
    }
}

export namespace preference {
    type Thumbnailer = "none" | "system" | "mapped";

    type ThumbnailSizing = "cover" | "full";

    type ThumbnailResolution = "default" | "high";

    type ThumbnailLabel = "full" | "one-line" | "disable";

    type PanelPosition = "left" | "right" | "bottom" | "disable";

    interface Set {
        /**
         * Number of columns in grid view
         */
        columns: number;

        /**
         * The ID of the ordering strategy to apply
         */
        order: number;

        /**
         * A choice specific parameter to apply
         */
        orderParam?: string;

        /**
         * The source of thumbnail files
         */
        thumbnail: Thumbnailer;

        /**
         * How thumbnail labels are presented
         */
        thumbnailLabel: ThumbnailLabel;

        /**
         * (if thumbnail is set) the format of the thumbnail path
         */
        thumbnailPath?: string;

        /**
         * Resolution of thumbnails generated from the system thumbnailer
         */
        thumbnailResolution?: ThumbnailResolution;

        /**
         * How thumbnail images are sized
         */
        thumbnailSizing: ThumbnailSizing;

        /**
         * How many files to preload in both directions in stage mode
         */
        preload: number;

        /**
         * The names of extensions to use
         */
        extensions: string[];

        /**
         * The position where the image lineup is docked
         */
        lineupPosition: PanelPosition;

        /**
         * The number of files to include in either directions
         */
        lineupEntries: number;
    }

    type Name = keyof Set;

    type NameSet = {[name in Name]?: 1};

    export type UpdateFn = (delta: Partial<preference.Set>, previous: preference.Set) => void;

    // Meant for persisted preferences that has a mutative effect on service state
    // this serves as a notifier that fires whenever a preference changes
    export interface Service extends EventEmitter {
        on(event: "change", cb: UpdateFn): this;
    }
}

export namespace tag {
    export type NamespaceID = number;

    export interface Namespace {
        /**
         * A magic number that identifies tags translatable by this namespace
         */
        identifier: NamespaceID;

        /**
         * The tags that are available in the directory
         */
        names: Map<number, string>;

        /**
         * The next free to assign to a tag
         */
        nextId: number;
    }

    export type ID = number;

    export interface Tags {
        namespace: NamespaceID;
        ids: Set<ID>;
    }

    export interface ServiceProperties {
        names: ReadonlyMap<number, string>;
        namespace: number;
    }

    // Think of the tagging service as a caching layer for file tag data
    export interface Service extends EventEmitter, ServiceProperties {
        createTag(name: string): Promise<ID>;
        deleteTag(id: ID): Promise<void>;
        renameTag(id: ID, newName: string): Promise<void>;

        toggleFileTag(tag: ID, fileName: string): Promise<void>;

        assignTag(tag: ID, fileNames: ReadonlyArray<string>): Promise<void>;
        clearTag(tag: ID, fileNames: ReadonlyArray<string>): Promise<void>;

        getFiles(id: ID): Promise<Set<string>>;
        getUntaggedFiles(): Promise<Set<string>>;
        getTags(file: string): Promise<Tags>;

        on(event: "change", handler: () => void): this;
        on(event: "filechange", handler: (fileName: string, tags: Tags) => void): this;
    }
}