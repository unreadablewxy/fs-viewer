import * as React from "react";
import {Switch, Route} from "react-router";
import {ServiceLookup} from "inconel";

import {GenericModeDef} from "../application";
import {BuiltinServices} from "../extension";

interface Props {
    services: ServiceLookup & BuiltinServices;
    preferences: Preferences;

    onNavigate(path: string, state?: unknown): void;

    modes: ReadonlyArray<GenericModeDef>;
}

interface State {
    menu: string | null;
    openTime: number;
}

export class Modes extends React.PureComponent<Props, State> {
    render(): React.ReactNode {
        const routes = this.props.modes.map(({id, path, component: Component}) => (
            <Route key={id} exact path={path}>
                <Component
                    onNavigate={this.props.onNavigate}
                    services={this.props.services}
                    preferences={this.props.preferences}
                />
            </Route>
        ));

        return <Switch>{routes}</Switch>;
    }
}