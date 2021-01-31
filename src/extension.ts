import type {
    Extension as BaseExtension,
    ComponentDefinition as BaseComponentDefinition,
} from "inconel";
import type {match} from "react-router";

import type {Service as DialogService} from "./dialog";
import type {Service as IPCService} from "./ipc";
import type {Service as ReaderService} from "./reader";
import type {BrowsingService} from "./browsing";
import type {Service as TaggingService} from "./tag";
import type {TransitionService} from "./stage/transition-service";
import type {PreferenceService} from "./application/preference-service";
import type {ProgressService} from "./progress";

/**
 * All services offered by the application to extensions
 */
export interface BuiltinServices {
    // Creates modal dialogs to prompt user for information
    readonly dialog: DialogService;

    // Manages IPC tunnels to other programs
    readonly ipc: IPCService;

    // Readonly file system operations
    readonly reader: ReaderService;

    readonly browsing: BrowsingService;
    readonly tagging: TaggingService;
    readonly transition: TransitionService;
    readonly preference: PreferenceService;
    readonly progress: ProgressService;
}

/**
 * Valid names of services to request
 */
export type BuiltinServiceNames = keyof BuiltinServices;

/**
 * Props common to all UI components
 */
export interface CommonComponentProps{
    onNavigate: (path: string, state?: unknown) => void;
};

/**
 * Props common to all exported UI components
 */
export interface ComponentDefinition<ServiceNames extends string, PreferenceMappedProps, SpecificProps>
    extends BaseComponentDefinition<ServiceNames, CommonComponentProps & PreferenceMappedProps & SpecificProps> {

    /**
     * The function that maps preferences to the component's props
     */
    readonly selectPreferences?: (prefs: Preferences) => PreferenceMappedProps;
}

export interface MenuSpecificProps {
    readonly path: string;

    onSetPreferences(values: Partial<Preferences>): void;

    readonly localPreferences: PreferenceNameSet;
    onTogglePreferenceScope(name: keyof Preferences): void;
}

export interface MenuSpecificDefs {
    readonly icon: string;
    readonly label: string;

    readonly path?: ReadonlyArray<string>;
    readonly requireDirectory?: boolean;
}

export type MenuDefinition<ServiceNames extends string, PreferenceMappedProps> = MenuSpecificDefs
    & ComponentDefinition<ServiceNames, PreferenceMappedProps, MenuSpecificProps>
;

export interface ModeSpecificDefs<Props> {
    readonly path: string;

    readonly selectRouteParams?: (location: Location, match: match) => Props;
}

export type ModeDefinition<ServiceNames extends string, PreferenceMappedProps, UrlMappedProps> = ModeSpecificDefs<UrlMappedProps>
    & ComponentDefinition<ServiceNames, PreferenceMappedProps, UrlMappedProps>
;

export interface ExtraSpecificDefs {
    readonly path: string;
}

export type ExtraDefinition<ServiceNames extends string, PreferenceMappedProps> = ExtraSpecificDefs
    & ComponentDefinition<ServiceNames, PreferenceMappedProps, {}>
;

/**
 * Expected shape of an extension module (i.e. its entry point file)
 */
export interface Extension extends BaseExtension {
    /**
     * Menus to add to the shell
     */
    readonly menus?: ReadonlyArray<MenuDefinition<string, any>>;

    /**
     * Modes to be added
     */
    readonly modes?: ReadonlyArray<ModeDefinition<string, any, any>>;

    /**
     * Extra components to add to particular modes
     */
    readonly extras?: ReadonlyArray<ExtraDefinition<string, any>>;
}