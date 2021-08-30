import * as React from "react";
import {ServiceLookup} from "inconel";

import {GenericExtraDef} from "../application/component";
import {BuiltinServices} from "../extension";

import type {preference} from "..";

interface Props {
    services: ServiceLookup & BuiltinServices;
    preferences: preference.Set;

    onNavigate(path: string, state?: unknown): void;

    extras: ReadonlyArray<GenericExtraDef>;

    locationPath: string;
}

interface State {
    menu: string | null;
    openTime: number;
}

export class Extras extends React.PureComponent<Props, State> {
    render(): React.ReactNode {
        const elements = new Array<JSX.Element>();

        for (const {id, path, component: Component} of this.props.extras) {
            if (!path || path === this.props.locationPath) {
                elements.push(<Component
                    key={id}
                    onNavigate={this.props.onNavigate}
                    services={this.props.services}
                    preferences={this.props.preferences}
                />);
            }
        }

        return <div className="extras">{elements}</div>;
    }
}