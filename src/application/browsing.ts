import {EventEmitter} from "events";

import {Debounce} from "../debounce";
import {method} from "../interface";
import {Pipeline} from "../pipeline";

import type {browsing} from "..";

class FilterPipeline extends Pipeline<browsing.FilterConfig, browsing.Filter> {
    public apply(files: browsing.FilesView): browsing.FilesView {
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

class ComparerPipeline extends Pipeline<browsing.ComparerConfig, browsing.Comparer> {
    public apply({path, names: fileNames}: browsing.FilesView): browsing.FilesView {
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

const NoFiles: browsing.FilesView = Object.seal({
    path: "",
    names: [],
});

export function create(): [browsing.Service, (files: browsing.FilesView) => void] {
    let files = NoFiles;

    const filters = new FilterPipeline();
    let filtersChanged = false;
    let filteredFiles: browsing.FilesView = NoFiles;

    const comparers = new ComparerPipeline();
    let comparersChanged = false;
    let comparedFiles: browsing.FilesView = NoFiles;

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

    function setFiles(f: browsing.FilesView): void {
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
        addFilter: { ...method, value: addFilter },
        removeFilter: { ...method, value: removeFilter },
        registerFilterProvider: { ...method, value: registerFilterProvider },
        addComparer: { ...method, value: addComparer },
        removeComparer: { ...method, value: removeComparer },
        registerComparerProvider: { ...method, value: registerComparerProvider },
        addSelection: { ...method, value: addSelection },
        clearSelection: { ...method, value: clearSelection },
        removeSelection: { ...method, value: removeSelection },
        setFocus: { ...method, value: setFocus },
        getSelectedNames: { ...method, value: getSelectedNames },
    }) as browsing.Service;

    async function addFilter(config: browsing.FilterConfig): Promise<number> {
        const id = await filters.add(config);
        filtersChanged = true;
        updateFilesList.schedule();
        return id;
    }

    function removeFilter(id: number): void {
        filters.remove(id);
        filtersChanged = true;
        updateFilesList.schedule();
    }

    function registerFilterProvider(type: string, provider: browsing.FilterProvider): void {
        filters.register(type, provider);
    }

    async function addComparer(config: browsing.ComparerConfig): Promise<number> {
        const id = await comparers.add(config);
        comparersChanged = true;
        updateFilesList.schedule();
        return id;
    }

    function removeComparer(id: number): void {
        comparers.remove(id);
        comparersChanged = true;
        updateFilesList.schedule();
    }

    function registerComparerProvider(type: string, provider: browsing.ComparerProvider): void {
        comparers.register(type, provider);
    }

    function addSelection(start: number, end: number): void {
        const newSelection = new Set(selected);
        while (start < end)
            newSelection.add(start++);

        setSelected(newSelection);
    }

    function clearSelection() {
        setSelected(new Set());
    }

    function removeSelection(start: number, end: number): void {
        const newSelection = new Set(selected);
        while (start < end)
            newSelection.delete(start++);

        setSelected(newSelection);
    }

    function setFocus(index: number | null): void {
        if (focusedFile !== index) {
            focusedFile = index;
            service.emit("filefocus", index);
        }
    }

    function getSelectedNames(): string[] | null {
        if (selected.size < 1)
            return null;

        const result = new Array<string>(selected.size);

        let n = 0;
        for (const v of selected)
            result[n++] = comparedFiles.names[v];

        return result;
    }

    return [service, setFiles];
}