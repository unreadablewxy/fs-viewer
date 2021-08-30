import "./menu.sass";
import * as React from "react";
import {mdiImageBroken, mdiFolderOpen, mdiArrowLeft} from "@mdi/js";
import {Icon} from "@mdi/react";
import {ServiceLookup} from "inconel";

import {Path as GalleryPath} from "../gallery";
import {GenericMenuDef} from "../application/component";
import {BuiltinServices} from "../extension";

import {MenuButton} from "./menu-button";
import {Selection} from "./selection";

import type {preference} from "..";

interface Props {
    services: ServiceLookup & BuiltinServices;
    preferences: preference.Set;
    onSetPreferences(values: Partial<preference.Set>): void;

    localPreferences: preference.NameSet;
    onTogglePreferenceScope(name: preference.Name): void;

    workingPath: string | null;
    onOpenDirectory(): void;
    onBacktrack(): void;

    locationPath: string;
    onNavigate(path: string, state?: unknown): void;

    menus: ReadonlyArray<GenericMenuDef>;
    focusLossTime: number;
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
    }

    componentWillUnmount(): void {
        this.props.services.progress.off("change", this.#forceUpdate);
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

            if (id === this.state.menu && this.state.openTime > this.props.focusLossTime)
                MenuComponent = component;
        }

        return <div className="panel">
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
                    visible={this.props.locationPath !== GalleryPath}
                    onClick={this.props.onBacktrack}
                />
                <Selection browsing={browsing} />
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
        this.setState(({menu, openTime}, {focusLossTime}) => {
            if (openTime > focusLossTime && newMenu === menu)
                return {menu: null, openTime: 0};

            this.props.onFocusGained();
            return {
                menu: newMenu,
                openTime: new Date().getTime(),
            };
        });
    }
}