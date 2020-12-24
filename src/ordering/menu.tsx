import * as React from "react";
import {mdiSort} from "@mdi/js";

import {Path as GalleryPath} from "../gallery";
import {Path as StagePath} from "../stage";
import {ScopeToggle} from "../scope-toggle";

import type {BrowsingService} from "../browsing";
import {FilesOrder} from "./comparer";

interface PreferenceMappedProps {
    order: number;
    orderParam?: string;
}

interface Props extends PreferenceMappedProps {
    browsing: BrowsingService;

    onSetPreferences(values: Partial<Preferences>): void;

    localPreferences: PreferenceNameSet;
    onTogglePreferenceScope(name: keyof Preferences): void;
}

export class Ordering extends React.PureComponent<Props> {
    private readonly toggleApproachScope: () => void;

    constructor(props: Props) {
        super(props);

        this.toggleApproachScope = () => this.props.onTogglePreferenceScope("order");

        this.handleSetOrder = this.handleSetOrder.bind(this);
        this.handleSetOrderParam = this.handleSetOrderParam.bind(this);
    }
    
    render(): React.ReactNode {
        const {localPreferences, order, orderParam} = this.props;
        const unsignedOrder = Math.abs(order);
        const requireSplitting = unsignedOrder === FilesOrder.Tokenize
            || unsignedOrder === FilesOrder.Dimensional;

        return <ul className="menu ordering">
            <li>
                <label>
                    <div>File Ordering</div>
                    <select value={unsignedOrder} onChange={this.handleSetOrder}>
                        <option value={FilesOrder.System}>Use system order</option>
                        <option value={FilesOrder.Lexical}>Compare names</option>
                        <option value={FilesOrder.Numeric}>Compare numeric names</option>
                        <option value={FilesOrder.Tokenize}>Split names</option>
                        <option value={FilesOrder.Dimensional}>Split numeric names</option>
                    </select>
                </label>
                <ScopeToggle
                    active={"order" in localPreferences}
                    onClick={this.toggleApproachScope} />
            </li>
            {unsignedOrder !== FilesOrder.System && <li>
                <label>
                    <div>Direction</div>
                    <select value={order} onChange={this.handleSetOrder}>
                        <option value={unsignedOrder}>Ascending</option>
                        <option value={-unsignedOrder}>Descending</option>
                    </select>
                </label>
            </li>}
            {requireSplitting && <li>
                <label>
                    <div>Separator</div>
                    <input type="text"
                        size={1}
                        placeholder="Text"
                        value={orderParam}
                        onChange={this.handleSetOrderParam} />
                </label>
            </li>}
        </ul>;
    }

    handleSetOrder(ev: React.ChangeEvent<HTMLSelectElement>): void {
        const order = parseInt(ev.target.value);
        this.props.onSetPreferences({order});
    }

    handleSetOrderParam(ev: React.ChangeEvent<HTMLInputElement>): void {
        const orderParam = ev.target.value;
        this.props.onSetPreferences({orderParam});
    }
}

export const Definition = {
    id: "ordering",
    icon: mdiSort,
    label: "Ordering",
    path: [GalleryPath, StagePath],
    requireDirectory: true,
    services: ["browsing"],
    component: Ordering,
    selectPreferences: ({
        order,
        orderParam,
    }: Preferences): PreferenceMappedProps => ({
        order,
        orderParam,
    }),
}