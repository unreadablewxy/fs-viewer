import * as React from "react";
import {findDOMNode} from "react-dom";
import {Switch, Route} from "react-router";
import {ServiceLookup} from "inconel";

import {GenericModeDef} from "../application/component";
import {BuiltinServices} from "../extension";

import type {preference} from "..";

interface Props {
    modes: ReadonlyArray<GenericModeDef>;
    preferences: preference.Set;
    services: ServiceLookup & BuiltinServices;

    focusAcquired: boolean;

    onNavigate(path: string, state?: unknown): void;
}

export class Modes extends React.PureComponent<Props> {
    componentDidUpdate(oldProps: Props) {
        if (!oldProps.focusAcquired && this.props.focusAcquired) {
            const node = findDOMNode(this) as HTMLElement;
            if (node && node.focus)
                node.focus();
        }
    }

    render(): React.ReactNode {
        const routes = this.props.modes.map(({id, path, component: Component}) => (
            <Route key={id} path={path}>
                {({match, location}) => <Component
                    onNavigate={this.props.onNavigate}
                    services={this.props.services}
                    preferences={this.props.preferences}
                    match={match}
                    location={location}
                />}
            </Route>
        ));

        return <Switch>{routes}</Switch>;
    }
}