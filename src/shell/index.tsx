import "./shell.sass";
import "../elements.sass"
import {History, Location} from "history";
import * as React from "react";
import {match, Switch, Route, withRouter} from "react-router";
import {createSelector} from "reselect";
import {Icon} from "@mdi/react";
import {
    mdiArrowLeft,
    mdiTag,
    mdiFolderOpen,
    mdiImageMove,
    mdiImageBroken,
    mdiSort,
    mdiViewGrid,
    mdiSelection,
} from "@mdi/js";

import {sinkEvent} from "../event";
import {Gallery} from "../gallery";
import {Stage} from "../stage";
import {Filter, filterFiles} from "./filter";
import {Ordering, FilesOrder, sortFiles} from "./ordering";
import {Shows} from "./shows";
import {SystemButtons} from "./system-buttons";
import {Thumbnails} from "./thumbnails";

enum Menu {
    None = 0,
    Filter,
    Thumbnails,
    Ordering,
    Shows,
}

enum Path {
    Gallery = "/",
    Stage = "/stage",
}

const NoFiles: FilesView = {
    path: "",
    names: [],
};

interface HistoryState {
    fileIndex: number,
}

interface Props {
    api: API;
    history: History<HistoryState>;
    location: Location<HistoryState>;
    match: match;
    preferences: Preferences;
}

type FilterLookup = {[tagId: number]: Set<string>};

const noTags = new Set<number>();

interface State {
    // Navigation related properties
    path: Path;
    menu?: Menu;
    focusTime: number;

    // Relevant to the opened directory
    files?: FilesView;
    selectedFiles: Set<number> | null;

    // Filtering state
    tags: TagNamespace;
    selectedTags: Set<number>;
    batchSelectedTags: Set<number>;
    filters: FilterLookup;

    // Preferences and the modification thereof
    preferences: Preferences;
    localPreferences?: Partial<Preferences>;
    localPreferencesUsed: PreferenceNameSet;

    // Other feature related ephemeral state
    transitionInterval: number;
    showActualSize: boolean;
}

function getFiles(s: State): FilesView {
    return s.files || NoFiles;
}

function getOrderPref(s: State): FilesOrder | number {
    return (getEffectivePreferencesMemoized(s) as Preferences).order;
}

function getOrderParam(s: State): string | undefined {
    return (getEffectivePreferencesMemoized(s) as Preferences)?.orderParam;
}

const sortFilesMemoized = createSelector<
    State,
    FilesView,
    FilesOrder,
    string | undefined,
    FilesView
>(getFiles, getOrderPref, getOrderParam, sortFiles);

function getFilters(s: State): FilterLookup {
    return s.filters;
}

const getFiltersMemoized = createSelector<
    State,
    FilterLookup,
    Set<string>[]
>(getFilters, Object.values);

const filterFilesMemoized = createSelector<
    State,
    FilesView,
    Set<string>[],
    FilesView
>(sortFilesMemoized, getFiltersMemoized, filterFiles);

function getGlobalPrefs(s: State): Preferences {
    return s.preferences;
}

function getDirectoryPrefs(s: State): Partial<Preferences> | undefined {
    return s.localPreferences;
}

function getLocalPreferencesUsed(s: State): PreferenceNameSet {
    return s.localPreferencesUsed;
}

function getEffectivePrefs(
    global: Preferences,
    directory: Partial<Preferences> | undefined,
    mask: PreferenceNameSet
): Preferences {
    if (!global || !directory)
        return global;

    const names = Object.keys(directory) as Array<keyof Preferences>;
    let result = Object.assign({}, global);
    for (let n = names.length; n --> 0;) {
        const name = names[n];
        const testName = parentPreference[name] || name;
        if (testName in mask) {
            const value = directory[name];
            (result as any)[name] = value;
        }
    }

    return result;
}

const getEffectivePreferencesMemoized = createSelector<
    State,
    Preferences,
    Partial<Preferences> | undefined,
    PreferenceNameSet,
    Preferences
>(getGlobalPrefs, getDirectoryPrefs, getLocalPreferencesUsed, getEffectivePrefs);

function inferUsedLocalPreferences(
    preferences: Partial<Preferences> | undefined
): PreferenceNameSet {
    if (!preferences)
        return {};

    const keys = Object.keys(preferences) as Array<keyof PreferenceNameSet>;
    return keys.reduce<PreferenceNameSet>((r, v) => {
        if (!(v in parentPreference))
            r[v] = 1;

        return r;
    }, {});
}

const parentPreference: {[name in PreferenceName]?: PreferenceName} = {
    "thumbnailPath": "thumbnail",
    "thumbnailResolution": "thumbnail",
};

interface Action {
    iconData: string;
    name: string;
    click: keyof ShellComponent;
    path?: Path;
}

const actions: Array<Action> = [
    {
        iconData: mdiTag,
        name: "Filtering",
        click: "handleToggleFiltering",
    },
    {
        iconData: mdiSort,
        name: "Ordering",
        click: "handleToggleSorting",
    },
    {
        iconData: mdiViewGrid,
        name: "Thumbnails",
        click: "handleToggleThumbnailer",
        path: Path.Gallery,
    },
    {
        iconData: mdiImageMove,
        name: "Show settings",
        click: "handleToggleShow",
        path: Path.Stage,
    },
];

const triviallyBoundMethods = [
    "handleKeyDown",
    "handleOpenDirectory",
    "handlePreloadChanged",
    "handleReturnHome",
    "handleSelectFile",
    "handleSelectChanged",
    "handleSetColumns",
    "handleSetOrder",
    "handleSetOrderParam",
    "handleSetThumbnailer",
    "handleThumbnailPathFormatChanged",
    "handleThumbnailResolutionChanged",
    "handleThumbnailSizingChanged",
    "handleToggleScaling",
    "handleSetTransitionInterval",
    "handleToggleUseLocalPreference",
    "handleToggleTag",
    "handleToggleBatchTag",
] as const;

type TriviallyBoundMethodName = typeof triviallyBoundMethods[number];

function bindTriviallyBoundMethod<K extends TriviallyBoundMethodName>(
    this: ShellComponent,
    name: K
): void {
    this[name] = this[name].bind(this);
}

export class ShellComponent extends React.Component<Props, State> {
    private readonly homePath: string;
    private unlistenHistory?: () => void;

    public readonly handleToggleSorting: () => void;
    public readonly handleToggleFiltering: () => void;
    public readonly handleToggleThumbnailer: () => void;
    public readonly handleToggleShow: () => void;

    constructor(props: Props, context: any) {
        super(props, context);

        this.state = {
            selectedTags: noTags,
            batchSelectedTags: noTags,
            path: Path.Gallery,
            tags: {
                identifier: 0,
                names: new Map<number, string>(),
                nextId: 1,
            },
            filters: {},
            localPreferencesUsed: {},
            transitionInterval: 0,
            focusTime: new Date().getTime(),
            selectedFiles: null,
            preferences: props.preferences,
            showActualSize: false,
        };

        this.homePath = props.location.pathname;

        triviallyBoundMethods.forEach(bindTriviallyBoundMethod, this);

        this.handleCreateTag = this.handleCreateTag.bind(this);
        this.handleDeleteTag = this.handleDeleteTag.bind(this);
        this.handleRenameTag = this.handleRenameTag.bind(this);
        this.handleMaybeLostFocus = this.handleMaybeLostFocus.bind(this);

        this.handleToggleSorting = this.setOpenMenu.bind(this, Menu.Ordering);
        this.handleToggleFiltering = this.setOpenMenu.bind(this, Menu.Filter);
        this.handleToggleThumbnailer = this.setOpenMenu.bind(this, Menu.Thumbnails);
        this.handleToggleShow = this.setOpenMenu.bind(this, Menu.Shows);

        this.unlistenHistory = this.props.history.listen(this.updateLocation.bind(this));
    }

    public componentWillUnmount(): void {
        if (this.unlistenHistory) {
            this.unlistenHistory();
            delete this.unlistenHistory;
        }
    }

    public componentDidUpdate(prevProps: Props, prevState: State): void {
        if (prevState.path !== this.state.path) {
            if (this.state.transitionInterval)
                this.setState({transitionInterval: 0});
        }
    }

    public render() {
        const preferences = getEffectivePreferencesMemoized(this.state);

        const files = filterFilesMemoized(this.state);

        const {api, location} = this.props;
        const {
            focusTime,
            path,
            selectedTags,
            menu,
            tags,
            localPreferencesUsed,
            transitionInterval,
            selectedFiles,
            showActualSize,
        } = this.state;

        const fileIndex = location.state?.fileIndex || 0;

        let selectedFile: string | undefined;
        if (files && path !== Path.Gallery)
            selectedFile = files.names[fileIndex];

        const selectedFilesCount = selectedFiles && selectedFiles.size || 0;
        const batchTagging = path === Path.Gallery && selectedFilesCount || 0;

        return <div tabIndex={0}
            onMouseDown={this.handleMaybeLostFocus}
            onKeyDown={this.handleKeyDown}
        >
            <Switch>
                <Route path={`${Path.Stage}/:file`}>
                    <Stage focusTime={focusTime}
                        files={files} // It's not possible to get here without loading a directory
                        fileIndex={fileIndex}
                        preload={preferences.preload}
                        transitionInterval={transitionInterval}
                        showActualSize={showActualSize}
                        onSetFileIndex={this.handleSelectFile} />
                </Route>
                <Route path="/">
                    <Gallery
                        columns={preferences.columns}
                        overscan={2}
                        initialFocus={fileIndex}
                        files={files}
                        thumbnailPath={preferences.thumbnail === "mapped" ? preferences.thumbnailPath : undefined}
                        thumbnailScaling={preferences.thumbnailSizing}
                        onPickFile={this.handleSelectFile}
                        selected={selectedFiles}
                        onSelectChanged={this.handleSelectChanged}
                        thumbnailResolution={preferences.thumbnailResolution} />
                </Route>
            </Switch>
            <nav onMouseDown={sinkEvent}>
                <SystemButtons api={api} />
                <div className={menu ? "background focus" : "background"}>
                    <ul className="actions">
                        <li className="application"><Icon path={mdiImageBroken} /></li>
                        <li onClick={this.handleOpenDirectory}>
                            <Icon path={mdiFolderOpen} />
                        </li>

                        {actions.map(a => <li key={a.name}
                            className={files === NoFiles || (a.path && a.path !== path) ? "hidden" : ""}
                            onClick={this[a.click]}
                            title={a.name}
                        >
                            <Icon path={a.iconData} />
                        </li>)}

                        <li className={path === Path.Gallery ? "hidden" : ""}
                            onClick={this.handleReturnHome}
                        >
                            <Icon path={mdiArrowLeft} />
                        </li>

                        <li className={selectedFilesCount < 1 ? "variadic hidden" : "variadic"}
                            title={`${selectedFilesCount} files selected`}>
                            <span>
                                <Icon path={mdiSelection} />
                                <span className="pill">{selectedFilesCount}</span>
                            </span>
                        </li>
                    </ul>

                    {menu === Menu.Filter && <Filter
                        api={api}
                        directory={files.path}
                        file={selectedFile}
                        tags={tags}
                        batchSize={batchTagging}
                        selectedTags={batchTagging ? this.state.batchSelectedTags : selectedTags}
                        onToggleTag={batchTagging ? this.handleToggleBatchTag : this.handleToggleTag}
                        onCreateTag={this.handleCreateTag}
                        onRenameTag={this.handleRenameTag}
                        onDeleteTag={this.handleDeleteTag} />}

                    {menu === Menu.Thumbnails && <Thumbnails
                        localPreferences={localPreferencesUsed}
                        onTogglePreferenceScope={this.handleToggleUseLocalPreference}
                        columns={preferences.columns}
                        onColsChanged={this.handleSetColumns}
                        thumbnailer={preferences.thumbnail}
                        onThumbnailerChanged={this.handleSetThumbnailer}
                        thumbnailPathFormat={preferences.thumbnailPath}
                        onThumbnailPathFormatChanged={this.handleThumbnailPathFormatChanged}
                        thumbnailResolution={preferences.thumbnailResolution}
                        onThumbnailResolutionChanged={this.handleThumbnailResolutionChanged}
                        thumbnailSizing={preferences.thumbnailSizing}
                        onThumbnailSizingChanged={this.handleThumbnailSizingChanged} />}

                    {menu === Menu.Ordering && <Ordering
                        localPreferences={localPreferencesUsed}
                        onTogglePreferenceScope={this.handleToggleUseLocalPreference}
                        order={preferences.order}
                        orderParam={preferences.orderParam}
                        onSetOrder={this.handleSetOrder}
                        onSetOrderParam={this.handleSetOrderParam} />}

                    {menu === Menu.Shows && <Shows
                        showActualSize={showActualSize}
                        onToggleScaling={this.handleToggleScaling}
                        localPreferences={localPreferencesUsed}
                        onTogglePreferenceScope={this.handleToggleUseLocalPreference}
                        preload={preferences.preload}
                        onPreloadChanged={this.handlePreloadChanged}
                        transitionInterval={transitionInterval}
                        onTransitionIntervalChanged={this.handleSetTransitionInterval} />}
                </div>
            </nav>
        </div>;
    }

    private navigate(path: string, historyState?: HistoryState): void {
        const {history, location} = this.props;
        if (!historyState)
            historyState = Object.assign({}, location.state);

        history.push(path, historyState);
    }

    private setOpenMenu(newMenu: Menu): void {
        this.setState(({menu}) => ({menu: newMenu === menu ? Menu.None : newMenu}));
    }

    private setPreference<K extends keyof Preferences>(
        newPrefs: Pick<Preferences, K>): void
    {
        this.setState(({
            files,
            localPreferences,
            localPreferencesUsed,
            preferences,
        }, {api}) => {
            type Returnables = "preferences" | "localPreferences";

            let result: Partial<Pick<State, Returnables>> = {};
            let localChanges: Partial<Preferences> = {};
            let globalChanges: Partial<Preferences> = {};

            const names = Object.keys(newPrefs) as Array<K>;
            for (let n = names.length; n --> 0;) {
                const name = names[n];
                const value = newPrefs[name];
                const testName = parentPreference[name] || name;
                if (testName in localPreferencesUsed) {
                    localChanges[name] = value;
                } else {
                    globalChanges[name] = value;
                }
            }

            if (Object.keys(globalChanges).length > 0) {
                result.preferences = Object.assign({}, preferences, globalChanges);
                api.savePreferences(result.preferences);
            }

            if (Object.keys(localChanges).length > 0) {
                result.localPreferences = Object.assign({}, localPreferences, localChanges);
                api.savePreferences(result.localPreferences, (files as FilesView).path);
            }

            return result as Pick<State, Returnables>;
        });
    }

    private updateLocation(location: Location<HistoryState>): void {
        if (location.pathname.startsWith(Path.Stage)) {
            this.setState({path: Path.Stage});
        } else {
            this.setState({path: Path.Gallery});
        }
    }

    private updateTagNamespace<T>(
        change: (ns: TagNamespace, state: State) => T,
    ): Promise<T> {
        let complete: () => void;
        let committed: Map<TagID, string>;

        return new Promise<T>((resolve, reject) => this.setState(
            state => {
                committed = new Map(state.tags.names.entries());
                const tags: TagNamespace = {
                    ...state.tags,
                    names: committed,
                };

                complete = resolve.bind(null, change(tags, state));
                return {tags};
            },
            () => {
                // See if we won the right to write
                if (committed === this.state.tags.names) {
                    const directory = (this.state.files as FilesView).path;
                    this.props.api.saveTagNamespace(directory, this.state.tags)
                        .then(complete, reject);
                } else {
                    complete();
                }
            }));
    }

    handleCreateTag(name: string): Promise<TagID> {
        return this.updateTagNamespace(ns => {
            const assignedId = ns.nextId;
            ns.names.set(assignedId, name);

            while (ns.names.has(ns.nextId))
                ++ns.nextId;

            return assignedId;
        });
    }

    async handleDeleteTag(id: TagID): Promise<void> {
        // Delete the tag from files first, fail results in retry
        // The other way around puts us in a bad state with dangling pointers
        const directory = (this.state.files as FilesView).path;
        await this.props.api.deleteTag(directory, id);

        await this.updateTagNamespace((ns, {selectedTags}) => {
            if (selectedTags.has(id))
                this.handleToggleTag(id);

            ns.names.delete(id);

            if (ns.nextId > id)
                ns.nextId = id;
        });
    }

    handleKeyDown(ev: React.KeyboardEvent): void {
        if (ev.key === "Escape" && !this.handleMaybeLostFocus())
            this.setState({selectedFiles: null});
    }

    handleMaybeLostFocus(): boolean {
        const result = this.state.menu;
        if (result)
            this.setState({
                menu: Menu.None,
                focusTime: new Date().getTime(),
            });

        return !!result;
    }

    handleOpenDirectory(): void {
        this.props.api.openDirectory().then(
            ({preferences: localPreferences, ...d}) => this.setState(
            {
                ...d,
                localPreferences,
                localPreferencesUsed: inferUsedLocalPreferences(localPreferences),
            }));
    }

    handlePreloadChanged(preload: number): void {
        this.setPreference({preload});
    }

    handleRenameTag(id: TagID, newName: string): Promise<void> {
        return this.updateTagNamespace(ns => {
            ns.names.set(id, newName);
        });
    }

    handleReturnHome(): void {
        this.navigate(this.homePath);
    }

    handleSelectFile(fileIndex: number): void {
        this.navigate(`/stage/${fileIndex}`, {fileIndex});
    }

    handleSelectChanged(start: number, end: number, clear: boolean): void {
        this.setState(state => {
            const selectedFiles = new Set<number>(state.selectedFiles);
            if (clear)
                while (end --> start) selectedFiles.delete(end);
            else
                while (end --> start) selectedFiles.add(end);

            return {selectedFiles, batchSelectedTags: noTags};
        });
    }

    handleSetColumns(columns: number): void {
        this.setPreference({columns});
    }

    handleSetOrder(order: FilesOrder): void {
        this.setPreference({order});
    }

    handleSetOrderParam(orderParam: string): void {
        this.setPreference({orderParam});
    }

    handleSetThumbnailer(thumbnail: Thumbnailer): void {
        this.setPreference({thumbnail});
    }

    handleThumbnailPathFormatChanged(thumbnailPath: string): void {
        this.setPreference({thumbnailPath});
    }

    handleThumbnailResolutionChanged(thumbnailResolution: ThumbnailResolution): void {
        this.setPreference({thumbnailResolution});
    }

    handleThumbnailSizingChanged(thumbnailSizing: ThumbnailSizing): void {
        this.setPreference({thumbnailSizing});
    }

    handleToggleScaling():void {
        this.setState(({showActualSize}) => ({showActualSize: !showActualSize}));
    }

    handleSetTransitionInterval(transitionInterval: number): void {
        if (transitionInterval < 1000 && transitionInterval !== 0)
            transitionInterval = 1000;

        this.setState({transitionInterval});
    }

    handleToggleUseLocalPreference(name: keyof Preferences): void {
        this.setState(({localPreferencesUsed}) => {
            if (localPreferencesUsed[name]) {
                const {[name]: _, ...remaining} = localPreferencesUsed;
                localPreferencesUsed = remaining;
            } else {
                localPreferencesUsed = {[name]: 1, ...localPreferencesUsed};
            }

            return {localPreferencesUsed};
        });
    }

    handleToggleTag(id: TagID): void {
        this.setState(({
            selectedTags: originalTags,
            filters: originalFilters
        }) => {
            const selectedFiles = null;

            if (originalTags.has(id)) {
                const selectedTags = new Set(originalTags);
                selectedTags.delete(id);

                const {[id]: _, ...filters} = originalFilters;
                return {selectedFiles, selectedTags, filters} as
                    Pick<State, "selectedFiles" | "selectedTags" | "filters">;
            }

            const directory = (this.state.files as FilesView).path;

            const loadTask = id === -1
                ? this.props.api.findUntaggedFiles(directory)
                : this.props.api.loadTagsIndex(directory, id);

            loadTask.then(
                fileNames => this.setState(({selectedTags, filters}) => {
                    if (!selectedTags.has(id))
                        return null;

                    filters = {[id]: fileNames, ...filters};
                    return {filters} as Pick<State, "filters">;
                }));

            const selectedTags = new Set(originalTags);
            selectedTags.add(id);
            return {selectedFiles, selectedTags} as
                Pick<State, "selectedFiles" | "selectedTags">;
        });
    }

    handleToggleBatchTag(id: TagID): void {
        this.setState(state => {
            let {batchSelectedTags, selectedFiles, tags} = state;
            if (!selectedFiles || batchSelectedTags.has(id))
                return null;

            const files = filterFilesMemoized(state);

            const fileNames = new Array<string>(selectedFiles.size);
            let n = 0;
            for (const index of selectedFiles)
                fileNames[n++] = files.names[index];

            batchSelectedTags = new Set<number>(batchSelectedTags);
            batchSelectedTags.add(id);

            this.props.api.addTagToFiles(files.path, fileNames, tags.identifier, id);

            return {batchSelectedTags};
        });
    }
}

export const Shell = withRouter(ShellComponent);