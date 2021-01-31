import "./shell.sass";
import * as React from "react";
import {withRouter, RouteComponentProps} from "react-router";
import {History} from "history";
import {ServiceLookup} from "inconel";

import {GenericExtraDef, GenericMenuDef, GenericModeDef} from "../application";
import {sinkEvent} from "../event";
import {BuiltinServices} from "../extension";

import {Extras} from "./extras";
import {Menu} from "./menu";
import {Modes} from "./modes";
import {SystemButtons} from "./system-buttons";

// Props mapped from router provided props
interface RouterProps {
    locationPath: string;
    history: History<unknown>;
}

// Props accepted from the parent component
interface ExternalProps {
    api: API;

    workingPath: string | null;

    preferences: Preferences;
    onSetPreferences(values: Partial<Preferences>): void;

    localPreferences: PreferenceNameSet;
    onTogglePreferenceScope(name: keyof Preferences): void;

    services: ServiceLookup & BuiltinServices;
    extras: ReadonlyArray<GenericExtraDef>;
    menus: ReadonlyArray<GenericMenuDef>;
    modes: ReadonlyArray<GenericModeDef>;

    onOpenDirectory(path: string): void;
    onNavigate(): void;
}

// Effective props of the component
interface Props extends ExternalProps, RouterProps {}

interface State {
    // Time when focus was last lost
    focusLossTime: number;

    // Whether residual UI focus should be applied
    focusAcquired: boolean;
}

export class ShellComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            focusLossTime: 1, // Resting state should be unfocused, so timestamp it 1 ms after epoch (heh)
            focusAcquired: false,
        };

        this.handleBacktrack = this.handleBacktrack.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleMaybeLostFocus = this.handleMaybeLostFocus.bind(this);
        this.handleNavigate = this.handleNavigate.bind(this);
        this.handleOpenDirectory = this.handleOpenDirectory.bind(this);
        this.handleMenuFocus = this.handleMenuFocus.bind(this);
    }

    public render(): React.ReactNode {
        const {api, preferences, services} = this.props;

        return <div tabIndex={0}
            onMouseDown={this.handleMaybeLostFocus}
            onKeyDown={this.handleKeyDown}
        >
            <Modes
                services={services}
                preferences={preferences}
                onNavigate={this.handleNavigate}
                modes={this.props.modes}
            />
            <Extras
                services={services}
                preferences={preferences}
                onNavigate={this.handleNavigate}
                extras={this.props.extras}
                locationPath={this.props.locationPath}
            />
            <nav className={this.state.focusAcquired ? "panel focus" : "panel"}
                onMouseDown={sinkEvent}
            >
                <SystemButtons api={api} />
                <Menu
                    services={services}
                    preferences={preferences}
                    onSetPreferences={this.props.onSetPreferences}
                    localPreferences={this.props.localPreferences}
                    onTogglePreferenceScope={this.props.onTogglePreferenceScope}
                    workingPath={this.props.workingPath}
                    onOpenDirectory={this.handleOpenDirectory}
                    onBacktrack={this.handleBacktrack}
                    locationPath={this.props.locationPath}
                    onNavigate={this.handleNavigate}
                    menus={this.props.menus}
                    focusLossTime={this.state.focusLossTime}
                    onFocusGained={this.handleMenuFocus}
                />
            </nav>
        </div>;
    }

    handleBacktrack(): void {
        this.props.history.goBack();
    }

    handleKeyDown(ev: React.KeyboardEvent): void {
        if (ev.key === "Escape")
            this.handleMaybeLostFocus();
    }

    handleMaybeLostFocus(): void {
        this.setState(({focusAcquired}) => focusAcquired
            ? {
                focusAcquired: false,
                focusLossTime: new Date().getTime(),
            }
            : null);
    }

    handleMenuFocus(): void {
        this.setState({
            focusAcquired: true,
        });
    }

    handleNavigate(path: string, state?: unknown): void {
        const {history} = this.props;
        history.push(path, state);
        this.props.onNavigate();
    }

    async handleOpenDirectory(): Promise<void> {
        const {api} = this.props;
        const path = await api.openDirectoryPrompt();
        this.props.onOpenDirectory(path);
    }
}

function ShellComponentWrapper({
    location,
    history,
    api,
    workingPath,
    preferences,
    onSetPreferences,
    localPreferences,
    onTogglePreferenceScope,
    services,
    extras,
    menus,
    modes,
    onOpenDirectory,
    onNavigate,
}: ExternalProps & RouteComponentProps) {
    // This may look redundant and one would be tempted to use varidic syntax
    // but please do not, as future versions of router could start injecting
    // variables that will cause superfluous redraws
    return <ShellComponent
        // External props
        api={api}
        workingPath={workingPath}
        preferences={preferences}
        onSetPreferences={onSetPreferences}
        localPreferences={localPreferences}
        onTogglePreferenceScope={onTogglePreferenceScope}
        services={services}
        extras={extras}
        menus={menus}
        modes={modes}
        onOpenDirectory={onOpenDirectory}
        onNavigate={onNavigate}

        // Mapped props
        history={history}
        locationPath={location.pathname}
    />;
}

export const Shell = withRouter(ShellComponentWrapper);