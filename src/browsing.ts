import {EventEmitter} from "events";
import {Debounce} from "./debounce";
import {Config, Stage, Provider, Pipeline} from "./pipeline";

/**
 * A stateful visitor is one that keeps state between invocations of its visit
 * function. These type allows one to keep data within or between invocations.
 */
interface StatefulVisitor extends Stage {
    begin?(): void;
    end?(): void;
}

export interface Filter extends StatefulVisitor {
    filter(files: FilesView): FilesView;
}

export interface Comparer extends StatefulVisitor {
    compare(workingDirectory: string, first: string, second: string): number;
}

export type FilterConfig = Config;

export type ComparerConfig = Config;

export type FilterProvider = Provider<FilterConfig, Filter>;

export type ComparerProvider = Provider<ComparerConfig, Comparer>;

interface Properties {
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
export interface BrowsingService extends Properties, EventEmitter {
    addFilter(filter: FilterConfig): Promise<number>;
    removeFilter(id: number): void;
    registerFilterProvider(type: string, provider: FilterProvider): void;

    addComparer(comparer: ComparerConfig): Promise<number>;
    removeComparer(id: number): void;
    registerComparerProvider(type: string, provider: ComparerProvider): void;

    addSelection(start: number, end: number): void;
    removeSelection(start: number, end: number): void;

    setFocus(index: number | null): void;

    getSelectedNames(): string[] | null;

    on(event: "fileschange", cb: () => void): this;
    on(event: "selectchange", cb: () => void): this;
    on(event: "filefocus", cb: (index: number | null) => void): this;
}

class FilterPipeline extends Pipeline<FilterConfig, Filter> {
    public apply(files: FilesView): FilesView {
        for (let n = 0; n < this.stages.length; ++n) {
            const filter = this.stages[n];
            filter.begin && filter.begin();

            try {
                files = filter.filter(files);
            } finally {
                filter.end && filter.end();
            }
        }

        return files;
    }
}

class ComparerPipeline extends Pipeline<ComparerConfig, Comparer> {
    public apply({path, names: fileNames}: FilesView): FilesView {
        for (let n = this.stages.length; n --> 0;) {
            const stage = this.stages[n];
            stage.begin && stage.begin();   
        }

        try {
            const names = fileNames.slice(0).sort((a, b) => {
                for (let c = this.stages.length; c --> 0;) {
                    const diff = this.stages[c].compare(path, a, b);
                    if (diff !== 0)
                        return diff;
                }

                return 0;
            });

            return {path, names};
        } finally {
            for (let n = this.stages.length; n --> 0;) {
                const stage = this.stages[n];
                stage.end && stage.end();
            }
        }
    }
}

const NoFiles: FilesView = Object.seal({
    path: "",
    names: [],
});

export function create(): [BrowsingService, (files: FilesView) => void] {
    let files = NoFiles;

    const filters = new FilterPipeline();
    let filtersChanged = false;
    let filteredFiles: FilesView = NoFiles;

    const comparers = new ComparerPipeline();
    let comparersChanged = false;
    let comparedFiles: FilesView = NoFiles;

    let selected = new Set<number>();

    let focusedFile: number | null = null;

    function setSelected(newVal: Set<number>): void {
        selected = newVal;
        service.emit("selectchange");
    }

    const updateFilesList = new Debounce<void>(() => {
        setSelected(new Set<number>());
        service.setFocus(null);

        if (filtersChanged)
            filteredFiles = filters.stages.length > 0
                ? filters.apply(files)
                : files;

        if (filtersChanged || comparersChanged)
            comparedFiles = comparers.stages.length > 0
                ? comparers.apply(filteredFiles)
                : filteredFiles;

        filtersChanged = comparersChanged = false;
        service.emit("fileschange");
    });

    function setFiles(f: FilesView): void {
        files = f;
        filtersChanged = comparersChanged = true;
        filters.clear();
        comparers.clear();
        updateFilesList.schedule();
    }

    const service = Object.defineProperties(new EventEmitter(), {
        files: {
            configurable: false,
            get: () => comparedFiles,
        },
        selected: {
            configurable: false,
            get: () => selected,
        },
        filters: {
            configurable: false,
            get: () => filters.stages,
        },
        comparers: {
            configurable: false,
            get: () => comparers.stages,
        },
        focusedFile: {
            configurable: false,
            get: () => focusedFile,
        },
    }) as BrowsingService;

    service.addFilter = async function(config: FilterConfig): Promise<number> {
        const id = await filters.add(config);
        filtersChanged = true;
        updateFilesList.schedule();
        return id;
    };

    service.removeFilter = function(id: number): void {
        filters.remove(id);
        filtersChanged = true;
        updateFilesList.schedule();
    }

    service.registerFilterProvider = function(type: string, provider: FilterProvider): void {
        filters.register(type, provider);
    }

    service.addComparer = async function(config: ComparerConfig): Promise<number> {
        const id = await comparers.add(config);
        comparersChanged = true;
        updateFilesList.schedule();
        return id;
    }

    service.removeComparer = function(id: number): void {
        comparers.remove(id);
        comparersChanged = true;
        updateFilesList.schedule();
    }

    service.registerComparerProvider = function(type: string, provider: ComparerProvider): void {
        comparers.register(type, provider);
    }

    service.addSelection = function(start: number, end: number): void {
        const newSelection = new Set(selected);
        while (start < end)
            newSelection.add(start++);

        setSelected(newSelection);
    };

    service.removeSelection = function(start: number, end: number): void {
        const newSelection = new Set(selected);
        while (start < end)
            newSelection.delete(start++);

        setSelected(newSelection);
    };

    service.setFocus = function(index: number | null): void {
        if (focusedFile !== index) {
            focusedFile = index;
            service.emit("filefocus", index);
        }
    };

    service.getSelectedNames = function(): string[] | null {
        if (selected.size < 1)
            return null;

        const result = new Array<string>(selected.size);

        let n = 0;
        for (const v of selected)
            result[n++] = comparedFiles.names[v];

        return result;
    };

    return [service, setFiles];
}