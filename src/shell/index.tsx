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
import type {WindowService} from "../window";

// Props mapped from router provided props
interface RouterProps {
    locationPath: string;
    history: History<unknown>;
}

// Props accepted from the parent component
interface ExternalProps {
    window: WindowService;

    workingPath: string | null;

    preferences: Preferences;
    onSetPreferences(values: Partial<Preferences>): void;

    localPreferences: PreferenceNameSet;
    onTogglePreferenceScope(name: keyof Preferences): void;

    services: ServiceLookup & BuiltinServices;
    extras: ReadonlyArray<GenericExtraDef>;
    menus: ReadonlyArray<GenericMenuDef>;
    modes: ReadonlyArray<GenericModeDef>;

    onOpenDirectory(): void;
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
    }

    componentDidUpdate(nextProps: Props): void {
        if (nextProps.locationPath !== this.props.locationPath)
            this.handleMaybeLostFocus();
    }

    render(): React.ReactNode {
        const {preferences, services} = this.props;

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
                <SystemButtons window={this.props.window} />
                <Menu
                    services={services}
                    preferences={preferences}
                    onSetPreferences={this.props.onSetPreferences}
                    localPreferences={this.props.localPreferences}
                    onTogglePreferenceScope={this.props.onTogglePreferenceScope}
                    workingPath={this.props.workingPath}
                    onOpenDirectory={this.props.onOpenDirectory}
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

    handleBacktrack = () => {
        this.props.history.goBack();
    };

    handleKeyDown = (ev: React.KeyboardEvent) => {
        if (ev.key === "Escape")
            this.handleMaybeLostFocus();
    };

    handleMaybeLostFocus = () => {
        this.setState(({focusAcquired}) => focusAcquired
            ? {
                focusAcquired: false,
                focusLossTime: new Date().getTime(),
            }
            : null);
    };

    handleMenuFocus = () => {
        this.setState({
            focusAcquired: true,
        });
    };

    handleNavigate = (path: string, state?: unknown) => {
        const {history} = this.props;
        history.push(path, state);
        this.props.onNavigate();
    };
}

export const Shell = withRouter(({
    location,
    history,
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
    window,
}: ExternalProps & RouteComponentProps) => React.createElement(ShellComponent, {
    // This may look redundant and one would be tempted to use varidic syntax
    // but please do not, as future versions of router could start injecting
    // variables that will cause superfluous redraws

    // External props
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
    window,

    // Mapped props
    history,
    locationPath: location.pathname,
}));