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
}

type FilterLookup = {[tagId: number]: Set<string>};

interface State {
    // Navigation related properties
    path: Path;
    menu?: Menu;

    // Relevant to the opened directory
    files?: FilesView;

    // Filtering state
    tags: TagNamespace;
    selectedTags: Set<number>;
    filters: FilterLookup;

    // Preferences and the modification thereof
    preferences?: Preferences;
    localPreferences?: Partial<Preferences>;
    localPreferencesUsed: PreferenceNameSet;

    // Other feature related ephemeral state
    transitionInterval: number;
}

function getFiles(s: State): FilesView {
    return s.files || NoFiles;
}

function getOrderPref(s: State): FilesOrder {
    return (getEffectivePreferencesMemoized(s) as Preferences).order;
}

function getFilters(s: State): FilterLookup {
    return s.filters;
}

const sortFilesMemoized = createSelector<
    State,
    FilesView,
    FilesOrder,
    FilesView
>(getFiles, getOrderPref, sortFiles);

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

function getGlobalPrefs(s: State): Preferences | undefined {
    return s.preferences;
}

function getDirectoryPrefs(s: State): Partial<Preferences> | undefined {
    return s.localPreferences;
}

function getLocalPreferencesUsed(s: State): PreferenceNameSet {
    return s.localPreferencesUsed;
}

function getEffectivePrefs(
    global: Preferences | undefined,
    directory: Partial<Preferences> | undefined,
    mask: PreferenceNameSet
): Preferences | undefined {
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
    Preferences | undefined,
    Partial<Preferences> | undefined,
    PreferenceNameSet,
    Preferences | undefined
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
    "handleKeyDownNav",
    "handleKeyDownShell",
    "handleMaybeLostFocus",
    "handleOpenDirectory",
    "handlePreloadChanged",
    "handleReturnHome",
    "handleSelectFile",
    "handleSetColumns",
    "handleSetOrder",
    "handleSetThumbnailer",
    "handleThumbnailPathFormatChanged",
    "handleSetTransitionInterval",
    "handleToggleUseLocalPreference",
    "handleToggleTag",
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
    private transitionTimer?: number;

    public readonly handleToggleSorting: () => void;
    public readonly handleToggleFiltering: () => void;
    public readonly handleToggleThumbnailer: () => void;
    public readonly handleToggleShow: () => void;

    constructor(props: Props, context: any) {
        super(props, context);

        this.state = {
            selectedTags: new Set<number>(),
            path: Path.Gallery,
            tags: {
                identifier: 0,
                names: new Map<number, string>(),
                nextId: 1,
            },
            filters: {},
            localPreferencesUsed: {},
            transitionInterval: 0,
        };

        const {history} = this.props;
        this.homePath = props.location.pathname;
        history.replace(this.homePath, {fileIndex: 0});

        triviallyBoundMethods.forEach(bindTriviallyBoundMethod, this);

        this.handleCreateTag = this.handleCreateTag.bind(this);

        this.handleToggleSorting = this.setOpenMenu.bind(this, Menu.Ordering);
        this.handleToggleFiltering = this.setOpenMenu.bind(this, Menu.Filter);
        this.handleToggleThumbnailer = this.setOpenMenu.bind(this, Menu.Thumbnails);
        this.handleToggleShow = this.setOpenMenu.bind(this, Menu.Shows);
    }

    public componentDidMount(): void {
        const {api, history} = this.props;

        this.unlistenHistory = history.listen(this.updateLocation.bind(this));

        api.loadPreferences().then(v => this.setState({preferences: v}));
    }

    public componentWillUnmount(): void {
        if (this.unlistenHistory) {
            this.unlistenHistory();
            delete this.unlistenHistory;
        }
    }

    public componentDidUpdate(prevProps: Props, prevState: State): void {
        const {transitionInterval} = this.state;
        if (prevState.transitionInterval !== transitionInterval) {
            if (this.transitionTimer)
                clearInterval(this.transitionTimer);

            if (transitionInterval === 0) {
                delete this.transitionTimer;
            } else {
                this.transitionTimer = window.setInterval(
                    () => this.navigateNext(),
                    transitionInterval);
            }
        }

        if (prevState.path !== this.state.path) {
            if (this.transitionTimer)
                clearInterval(this.transitionTimer);
    
            if (this.state.transitionInterval)
                this.setState({transitionInterval: 0});
        }
    }

    public render() {
        const preferences = getEffectivePreferencesMemoized(this.state);
        if (!preferences)
            return <></>;

        const files = filterFilesMemoized(this.state);

        const {api, location} = this.props;
        const {
            path,
            selectedTags,
            menu,
            tags,
            localPreferencesUsed,
            transitionInterval,
        } = this.state;

        let selectedFile: string | undefined;
        let selectedDirectory: string | undefined;
        if (files && path !== Path.Gallery) {
            selectedFile = files.names[location.state.fileIndex];
            selectedDirectory = files.path;
        }

        return <div tabIndex={0}
            onMouseDown={this.handleMaybeLostFocus}
            onKeyDown={this.handleKeyDownShell}
        >
            <Switch>
                <Route
                    path={`${Path.Stage}/:file`}
                    render={p => <Stage
                        files={files} // It's not possible to get here without loading a directory
                        fileIndex={p.location.state.fileIndex}
                        preload={preferences.preload}
                        onSetFileIndex={this.handleSelectFile} />}
                />
                <Route
                    path="/"
                    render={p => <Gallery
                        columns={preferences.columns}
                        overscan={2}
                        initialFocus={p.location.state?.fileIndex || 0}
                        files={files}
                        thumbnailPath={preferences.thumbnail === "mapped" && preferences.thumbnailPath}
                        onFileSelected={this.handleSelectFile} />}
                />
            </Switch>
            <nav onMouseDown={sinkEvent} onKeyDown={this.handleKeyDownNav}>
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
                    </ul>

                    {menu === Menu.Filter && <Filter
                        api={api}
                        directory={selectedDirectory}
                        file={selectedFile}
                        tags={tags}
                        filteringTags={selectedTags}
                        onToggleTag={this.handleToggleTag}
                        onCreateTag={this.handleCreateTag} />}

                    {menu === Menu.Thumbnails && <Thumbnails
                        localPreferences={localPreferencesUsed}
                        onTogglePreferenceScope={this.handleToggleUseLocalPreference}
                        columns={preferences.columns}
                        onColsChanged={this.handleSetColumns}
                        thumbnailer={preferences.thumbnail}
                        onThumbnailerChanged={this.handleSetThumbnailer}
                        thumbnailPathFormat={preferences.thumbnailPath}
                        onThumbnailPathFormatChanged={this.handleThumbnailPathFormatChanged} />}

                    {menu === Menu.Ordering && <Ordering
                        localPreferences={localPreferencesUsed}
                        onTogglePreferenceScope={this.handleToggleUseLocalPreference}
                        order={preferences.order}
                        onSetOrder={this.handleSetOrder} />}

                    {menu === Menu.Shows && <Shows
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

    private navigateNext(): void { 
        const fileIndex = this.props.location.state.fileIndex;
        const files = filterFilesMemoized(this.state);
        if (files && fileIndex < files.names.length - 1)
            this.handleSelectFile(fileIndex + 1);
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

            return result;
        });
    }

    private updateLocation(location: Location<HistoryState>): void {
        if (location.pathname.startsWith(Path.Stage)) {
            this.setState({path: Path.Stage});
        } else {
            this.setState({path: Path.Gallery});
        }
    }

    handleCreateTag(name: string): Promise<TagID> {
        return new Promise((resolve, reject) => {
            this.setState(
                s => {
                    const result: TagNamespace = {
                        ...s.tags,
                        names: new Map(s.tags.names.entries()),
                    };
    
                    result.names.set(result.nextId, name);
                    resolve(result.nextId);

                    while (result.names.has(result.nextId))
                        ++result.nextId;
    
                    return {tags: result};
                },
                () => {
                    const directory = (this.state.files as FilesView).path;
                    this.props.api.saveTagNamespace(directory, this.state.tags);
                });
        });
    }

    handleKeyDownNav(ev: React.KeyboardEvent): void {
        if (ev.key === "Escape")
            this.handleMaybeLostFocus();
        
        ev.stopPropagation();
    }

    handleKeyDownShell(ev: React.KeyboardEvent): void {
        const locationState = this.props.location.state;
        switch (ev.key) {
        case "Escape":
            this.handleMaybeLostFocus();
            break;

        case "ArrowRight":
            this.navigateNext();
            break;

        case "ArrowLeft":
            if (locationState.fileIndex)
                this.handleSelectFile(locationState.fileIndex - 1);
            break;
        }
    }

    handleMaybeLostFocus(): void {
        if (this.state.menu)
            this.setState({menu: Menu.None});
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

    handleReturnHome(): void {
        this.navigate(this.homePath);
    }

    handleSelectFile(fileIndex: number): void {
        this.navigate(`/stage/${fileIndex}`, {fileIndex});
    }

    handleSetColumns(columns: number): void {
        this.setPreference({columns});
    }

    handleSetOrder(order: FilesOrder): void {
        this.setPreference({order});
    }

    handleSetThumbnailer(thumbnail: Thumbnailer): void {
        this.setPreference({thumbnail});
    }

    handleThumbnailPathFormatChanged(thumbnailPath: string): void {
        this.setPreference({thumbnailPath});
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
        }): Pick<State, "selectedTags"> | Pick<State, "selectedTags" | "filters">  => {
            if (originalTags.has(id)) {
                const selectedTags = new Set(originalTags);
                selectedTags.delete(id);

                const {[id]: _, ...filters} = originalFilters;
                return {selectedTags, filters};
            }

            const directory = (this.state.files as FilesView).path;
            this.props.api.loadTagsIndex(directory, id).then(
                tags => this.setState(({selectedTags, filters}) => {
                    if (!selectedTags.has(id))
                        return null;

                    filters = {[id]: tags, ...filters};
                    return {filters};
                }));

            const selectedTags = new Set(originalTags);
            selectedTags.add(id);
            return {selectedTags};
        });
    }
}

export const Shell = withRouter(ShellComponent);