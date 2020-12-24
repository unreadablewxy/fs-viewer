import "./menu.sass";
import * as React from "react";
import {mdiImageBroken, mdiFolderOpen, mdiArrowLeft, mdiSelection} from "@mdi/js";
import {Icon} from "@mdi/react";
import {ServiceLookup} from "inconel";

import {GenericMenuDef} from "../application";
import {BuiltinServices} from "../extension";

import {MenuButton} from "./menu-button";

interface Props {
    services: ServiceLookup & BuiltinServices;
    preferences: Preferences;
    onSetPreferences(values: Partial<Preferences>): void;

    localPreferences: PreferenceNameSet;
    onTogglePreferenceScope(name: keyof Preferences): void;

    workingPath: string | null;
    onOpenDirectory(): Promise<void>;
    onBacktrack(): void;

    locationPath: string;
    onNavigate(path: string, state?: unknown): void;

    menus: ReadonlyArray<GenericMenuDef>;
    focusTime: number;
    onFocusGained(): void;
}

interface State {
    menu: string | null;
    openTime: number;
}

export class Menu extends React.PureComponent<Props, State> {
    readonly #forceUpdate = (): void => { this.forceUpdate(); };

    constructor(props: Props) {
        super(props);

        this.state = {
            menu: null,
            openTime: 0,
        };

        this.handleToggleMenu = this.handleToggleMenu.bind(this);
    }

    componentDidMount(): void {
        this.props.services.progress.on("change", this.#forceUpdate);
        this.props.services.browsing.on("selectchange", this.#forceUpdate);
    }

    componentWillUnmount(): void {
        this.props.services.progress.off("change", this.#forceUpdate);
        this.props.services.browsing.off("selectchange", this.#forceUpdate);
    }

    render(): React.ReactNode {
        const {locationPath, services, workingPath} = this.props;
        const {browsing, progress} = services;

        const busyMenus: {[id: string]: true} = {};
        for (const [, t] of progress.entries)
            if (t.menu)
                busyMenus[t.menu] = true;

        let MenuComponent: GenericMenuDef["component"] | undefined;
        const menus = new Array<JSX.Element>(this.props.menus.length);
        for (let m = menus.length; m --> 0;) {
            const {id, icon, label, path, requireDirectory, component} = this.props.menus[m];
            menus[m] = <MenuButton key={id}
                id={id}
                icon={icon}
                label={label}
                busy={busyMenus[id]}
                visible={!(!workingPath && requireDirectory)
                    && (!path || path.includes(locationPath))}
                onClick={this.handleToggleMenu}
            />

            if (id === this.state.menu && this.state.openTime > this.props.focusTime)
                MenuComponent = component;
        }

        const selectedFilesCount = browsing.selected.size;

        return <div className="background">
            <ul className="actions">
                <li className="application">
                    <Icon path={mdiImageBroken} />
                </li>
                <li onClick={this.props.onOpenDirectory}>
                    <Icon path={mdiFolderOpen} />
                </li>
                {menus}
                <MenuButton id=""
                    icon={mdiArrowLeft}
                    label="Go back"
                    visible={this.props.locationPath !== "/"}
                    onClick={this.props.onBacktrack}
                />
                <li className={selectedFilesCount < 1 ? "variadic hidden" : "variadic"}
                    title={`${selectedFilesCount} files selected`}>
                    <span>
                        <Icon path={mdiSelection} />
                        {selectedFilesCount > 0 && <span className="pill">{selectedFilesCount}</span>}
                    </span>
                </li>
            </ul>

            {MenuComponent && <MenuComponent
                path={locationPath}
                onNavigate={this.props.onNavigate}
                services={services}
                preferences={this.props.preferences}
                localPreferences={this.props.localPreferences}
                onSetPreferences={this.props.onSetPreferences}
                onTogglePreferenceScope={this.props.onTogglePreferenceScope}
            />}
        </div>;
    }

    handleToggleMenu(newMenu: string): void {
        this.setState(({menu, openTime}, {focusTime}) => {
            if (openTime > focusTime && newMenu === menu)
                return {menu: null, openTime: 0};

            this.props.onFocusGained();
            return {
                menu: newMenu,
                openTime: new Date().getTime(),
            };
        });
    }
}