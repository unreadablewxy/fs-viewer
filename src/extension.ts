import type {
    Extension as BaseExtension,
    ComponentDefinition as BaseComponentDefinition,
} from "inconel";
import type {match} from "react-router";

import type {Service as DialogService} from "./dialog";
import type {TransitionService} from "./stage/transition-service";
import type {ProgressService} from "./progress";

import type {browsing, ipc, io, preference, tag} from "..";

/**
 * All services offered by the application to extensions
 */
export interface BuiltinServices {
    // Creates modal dialogs to prompt user for information
    readonly dialog: DialogService;

    // Manages IPC tunnels to other programs
    readonly ipc: ipc.Service;

    // Readonly file system operations
    readonly reader: io.Reader;
    readonly writer: io.Writer;

    readonly browsing: browsing.Service;
    readonly tagging: tag.Service;
    readonly transition: TransitionService;
    readonly preference: preference.Service;
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
    readonly selectPreferences?: (prefs: preference.Set) => PreferenceMappedProps;
}

export interface MenuSpecificProps {
    readonly path: string;

    onSetPreferences(values: Partial<preference.Set>): void;

    readonly localPreferences: preference.NameSet;
    onTogglePreferenceScope(name: preference.Name): void;
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