import "../elements.sass"

import * as React from "react";
import type {match} from "react-router-dom";
import type {History} from "history";
import {createSelector} from "reselect";
import {ComponentDefinition as BaseComponentDefinition, ServiceLookup, HostBuilder} from "inconel";

import {create as createBrowsingService} from "../browsing";
import {
    BuiltinServices,
    CommonComponentProps,

    ExtraDefinition,
    ExtraSpecificDefs,

    Extension,

    ModeDefinition,
    ModeSpecificDefs,

    MenuDefinition,
    MenuSpecificDefs,
    MenuSpecificProps,
    ComponentDefinition,
} from "../extension";
import {Path as GalleryPath} from "../gallery";
import {initialize as initializeOrdering} from "../ordering";
import {ProgressService} from "../progress";
import {Shell} from "../shell";
import {createTransitionService} from "../stage";
import {createTaggingService} from "../tag";

import {builtinMenus, builtinModes} from "./builtin";
import {create as createPreferenceService} from "./preference-service";
import {WebExtensionLoader} from "./react-loader";

const parentPreference: {[name in PreferenceName]?: PreferenceName} = {
    "thumbnailPath": "thumbnail",
    "thumbnailResolution": "thumbnail",
};

const getEffectivePreferencesMemoized = createSelector(
    (s: State) => s.userPreferences, 
    (s: State) => s.localPreferences,
    (s: State) => s.localPreferencesUsed,
    (
        global: Preferences | null,
        directory: Partial<Preferences> | null,
        mask: PreferenceNameSet
    ): Preferences | null => {
        if (!directory || !global)
            return global;

        const names = Object.keys(directory) as Array<PreferenceName>;
        const result = Object.assign({}, global);
        for (let n = names.length; n --> 0;) {
            const name = names[n];
            const testName = parentPreference[name] || name;
            if (testName in mask) {
                const value = directory[name];
                (result[name] as unknown) = value;
            }
        }

        return result;
    }
);

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

interface Props {
    readonly api: API;
    readonly document: Document;
    readonly history: History;
}

interface GenericProps extends CommonComponentProps {
    services: ServiceLookup;
    preferences: Preferences;
}

interface GenericModeProps extends GenericProps {
    location: Location;
    match: match;
}

export type GenericExtraDef =
    BaseComponentDefinition<string, GenericProps> & ExtraSpecificDefs;

export type GenericMenuDef =
    BaseComponentDefinition<string, MenuSpecificProps & GenericProps> & MenuSpecificDefs;

export type GenericModeDef =
    BaseComponentDefinition<string, GenericProps> & ModeSpecificDefs<unknown>;

interface State {
    workingPath: string | null;

    errors?: {[source: string]: Error};

    // Preferences and the modification thereof
    localPreferences: Partial<Preferences> | null;
    localPreferencesUsed: PreferenceNameSet;
    userPreferences: Preferences | null;

    services: ServiceLookup;
    extras: ReadonlyArray<GenericExtraDef>;
    menus: ReadonlyArray<GenericMenuDef>;
    modes: ReadonlyArray<GenericModeDef>;
}

const InitialState = {
    workingPath: null,
    userPreferences: null,
    localPreferences: null,
    localPreferencesUsed: {},
    services: {},
    extras:[],
    menus: [],
    modes: [],
};

function mapProps(
    def: MenuDefinition<string, unknown>,
    props: GenericProps & MenuSpecificProps,
): CommonComponentProps & MenuSpecificProps;
function mapProps(
    def: ExtraDefinition<string, unknown>,
    props: GenericProps,
): CommonComponentProps;
function mapProps(
    def: ComponentDefinition<string, unknown, any>,
    props: GenericProps | (GenericProps & MenuSpecificProps),
): CommonComponentProps | (CommonComponentProps & MenuSpecificProps) {
    return def.selectPreferences
        ? Object.assign(props, def.selectPreferences(props.preferences))
        : props;
}

function mapModeProps(
    def: ModeDefinition<string, unknown, unknown>,
    props: GenericModeProps,
): CommonComponentProps {
    const result = mapProps(def, props);
    return def.selectRouteParams
        ? Object.assign(result, def.selectRouteParams(props.location, props.match))
        : result;
}

const excludedErrorProperties: {[k in string]: 1} = {
    message: 1,
    stack: 1,
    name: 1,
};

function stringifyError(err: Error): string {
    let result = `${err.message}\n`;

    for (const n of Object.getOwnPropertyNames(err)) if (!excludedErrorProperties[n])
        result += `\t${n}: ${JSON.stringify(err[n as keyof Error])}\n`;

    return result;
}

/**
 * An incorporeal component that moderates interactions between services,
 * components, and preferences.
 */
export class Application extends React.Component<Props, State> {
    private readonly builtinServices: BuiltinServices;

    private readonly setFilesView: (files: FilesView) => void;
    private readonly stopTransitions: () => void;
    private readonly onPreferenceChanged: (delta: Partial<Preferences>, previous: Preferences) => void;

    constructor(props: Props) {
        super(props);
        this.state = InitialState;

        const [browsing, setFilesView] = createBrowsingService();
        this.setFilesView = setFilesView;

        const [transition, stopTransitions] = createTransitionService(window);
        this.stopTransitions = stopTransitions;

        const tagging = createTaggingService(props.api, browsing);

        const [preference, preferenceChanged] = createPreferenceService();
        this.onPreferenceChanged = preferenceChanged;

        initializeOrdering(browsing, preference);

        this.builtinServices = {
            ipc: {
                createRequest: (size) => new props.api.Request(size),
                connect: props.api.createIPCConnection,
                spawn: props.api.spawnChildProcess,
            },
            dialog: {
                openDirectoryPrompt: props.api.openDirectoryPrompt,
                openFilePrompt: props.api.openFilePrompt,
            },
            reader: {
                joinPath: props.api.joinPath,
                reduceTextFile: props.api.reduceTextFile,
            },
            browsing,
            tagging,
            transition,
            preference,
            progress: new ProgressService(),
        };

        this.handleOpenDirectory = this.handleOpenDirectory.bind(this);
        this.handlePreferenceScope = this.handlePreferenceScope.bind(this);
        this.handleSetPreference = this.handleSetPreference.bind(this);
    }

    private async startup(): Promise<Partial<State>> {
        const {api, document} = this.props;
        const userPreferences = await api.loadPreferences();

        WebExtensionLoader.init();
        const loader = new WebExtensionLoader(api.getExtensionRoot());
        const extensionHost = new HostBuilder<Extension>(loader, document)
            .withBuiltinServices(this.builtinServices as unknown as ServiceLookup)
            .withReactComponents<GenericProps & MenuSpecificProps, "menus">("menus", mapProps, builtinMenus)
            .withReactComponents<GenericModeProps, "modes">("modes", mapModeProps, builtinModes)
            .withReactComponents<GenericProps, "extras">("extras", mapProps)
            .build();

        const loadingResult = await extensionHost.load(...userPreferences.extensions);
        if (!loadingResult.success) {
            return {
                errors: loadingResult.errors,
            };
        }

        return {
            userPreferences,
            extras: extensionHost.components.extras as unknown as ReadonlyArray<GenericExtraDef>,
            menus: extensionHost.components.menus as unknown as ReadonlyArray<GenericMenuDef>,
            modes: extensionHost.components.modes as unknown as ReadonlyArray<GenericModeDef>,
            services: extensionHost.services,
        };
    }

    componentDidMount(): void {
        this.startup().then(
            statePatch => this.setState(statePatch as State),
            error => this.setState({errors: {["application"]: error}}));
    }

    render(): React.ReactNode {
        const {errors} = this.state;
        if (errors)
            return <pre>{Object.keys(errors).map(src => `${src}: ${stringifyError(errors[src])}`).join("\n")}</pre>;

        const preferences = getEffectivePreferencesMemoized(this.state);
        if (preferences) return <Shell
            api={this.props.api}

            workingPath={this.state.workingPath}

            preferences={preferences}
            onSetPreferences={this.handleSetPreference}

            localPreferences={this.state.localPreferencesUsed}
            onTogglePreferenceScope={this.handlePreferenceScope}

            services={this.state.services as ServiceLookup & BuiltinServices}
            extras={this.state.extras}
            menus={this.state.menus}
            modes={this.state.modes}

            onOpenDirectory={this.handleOpenDirectory}
            onNavigate={this.stopTransitions}
        />

        return null;
    }

    async handleOpenDirectory(path: string): Promise<void> {
        if (path === this.state.workingPath)
            return;

        const {history, api} = this.props;

        // Do not combine this with history.push block, browsers don't appreciate
        // attempts to delete history. But this hack works because there's an
        // async IO in between the two history calls
        if (history.length > 1)
            history.go(-(history.length - 1));

        const {files, preferences} = await api.openDirectory(path);

        if (history.length > 1)
            history.push(GalleryPath);

        this.setFilesView(files);
        this.setState({
            workingPath: path,
            localPreferences: preferences,
            localPreferencesUsed: inferUsedLocalPreferences(preferences),
        }, () => {
            const prefs = getEffectivePreferencesMemoized(this.state) as Preferences;
            this.onPreferenceChanged(prefs, prefs);
        });
    }

    handlePreferenceScope(name: PreferenceName): void {
        const effective = getEffectivePreferencesMemoized(this.state) || {} as Preferences;

        this.setState(({localPreferencesUsed, localPreferences, userPreferences}) => {
            if (localPreferencesUsed[name]) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const {[name]: _, ...remaining} = localPreferencesUsed;
                localPreferencesUsed = remaining;
                this.onPreferenceChanged({[name]: (userPreferences || {})[name]}, effective);
            } else {
                localPreferencesUsed = {[name]: 1, ...localPreferencesUsed};
                this.onPreferenceChanged({[name]: (localPreferences || {})[name]}, effective);
            }

            return {localPreferencesUsed};
        });
    }

    handleSetPreference<K extends PreferenceName>(
        newPrefs: Pick<Preferences, K>,
    ): void {
        const effective = getEffectivePreferencesMemoized(this.state) || {} as Preferences;

        this.setState(({
            workingPath,
            localPreferences,
            localPreferencesUsed,
            userPreferences,
        }, {api}) => {
            type Returnables = "userPreferences" | "localPreferences";

            const result: Partial<Pick<State, Returnables>> = {};
            const localChanges: Partial<Preferences> = {};
            const userChanges: Partial<Preferences> = {};

            const names = Object.keys(newPrefs) as Array<K>;
            for (let n = names.length; n --> 0;) {
                const name = names[n];
                const value = newPrefs[name];
                const testName = parentPreference[name] || name;
                if ((testName as string) in localPreferencesUsed) {
                    localChanges[name] = value;
                } else {
                    userChanges[name] = value;
                }
            }

            if (Object.keys(userChanges).length) {
                result.userPreferences = Object.assign({}, userPreferences, userChanges);
                api.savePreferences(result.userPreferences);
            }

            if (workingPath) {
                if (Object.keys(localChanges).length > 0) {
                    result.localPreferences = Object.assign({}, localPreferences, localChanges);
                    api.savePreferences(result.localPreferences, workingPath);
                }
            }

            this.onPreferenceChanged(newPrefs, effective);

            return result as Pick<State, Returnables>;
        });
    }
}