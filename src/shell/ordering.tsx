import * as React from "react";
import {ScopeToggle} from "./scope-toggle";

export enum FilesOrder {
    System = 0,
    Lexical,
    Numeric,
}

interface CompareCache {
    [k: string]: any;
}

type CompareFunction = (cache: CompareCache, a: string, b: string) => number;

type CompareLookup = {
    [key in FilesOrder]?: CompareFunction;
};

function parseNumericName(fileName: string, radix: number) {
    const delimiterIndex = fileName.lastIndexOf(".");
    if (delimiterIndex > 0)
        fileName = fileName.slice(0, delimiterIndex);

    return parseInt(fileName, 10);
}

const compareFunctions: CompareLookup = {
    [FilesOrder.Lexical]: (_, a, b) => a.localeCompare(b),
    [FilesOrder.Numeric]: (cache, a, b) => {
        return (cache[a] || (cache[a] = parseNumericName(a, 10)))
             - (cache[b] || (cache[b] = parseNumericName(b, 10)));
    },
};

export function sortFiles(files: FilesView, order: FilesOrder): FilesView {
    const comparer = order && compareFunctions[order];
    if (!comparer || files.names.length < 1)
        return files;

    return {
        path: files.path,
        names: files.names.slice(0).sort(comparer.bind(null, {})),
    };
}

interface Props {
    localPreferences: PreferenceNameSet;
    onTogglePreferenceScope(name: keyof Preferences): void;

    order: FilesOrder;
    onSetOrder(order: FilesOrder): void;
}

export class Ordering extends React.PureComponent<Props> {
    private readonly toggleApproachScope: () => void;

    constructor(props: Props, context: any) {
        super(props, context);

        this.toggleApproachScope = () => this.props.onTogglePreferenceScope("order");

        this.handleSetOrder = this.handleSetOrder.bind(this);
    }
    
    public render() {
        const {localPreferences, order} = this.props;

        return <ul className="menu ordering">
            <li>
                <label>
                    <div>Approach</div>
                    <select value={order} onChange={this.handleSetOrder}>
                        <option value={FilesOrder.System}>Use system order</option>
                        <option value={FilesOrder.Lexical}>Compare names</option>
                        <option value={FilesOrder.Numeric}>Compare numeric names</option>
                    </select>
                </label>
                <ScopeToggle
                    active={"order" in localPreferences}
                    onClick={this.toggleApproachScope} />
            </li>
            <li>
                <label>
                    <div>Name format</div>
                    <input placeholder="Expression" />
                </label>
                <ScopeToggle active={true} onClick={() => {}} />
            </li>
            <li>
                <label>
                    <div>Direction</div>
                    <select>
                        <option value="asc">Ascending</option>
                        <option value="des">Descending</option>
                    </select>
                </label>
                <ScopeToggle active={true} onClick={() => {}} />
            </li>
        </ul>;
    }

    private handleSetOrder(ev: React.ChangeEvent<HTMLSelectElement>): void {
        this.props.onSetOrder(parseInt(ev.currentTarget.value));
    }
}