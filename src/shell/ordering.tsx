import * as React from "react";
import {ScopeToggle} from "./scope-toggle";

export enum FilesOrder {
    System = 0,
    Lexical,
    Numeric,
    Tokenize,
    Dimensional,
}

interface CompareCache {
    [k: string]: any;
}

interface CompareFunction {
    (cache: CompareCache, a: string, b: string): number;

    init?(cache: CompareCache, param: string): void;
}

type CompareLookup = {
    [key in FilesOrder]?: CompareFunction;
};

function parseNumericName(fileName: string): number {
    const delimiterIndex = fileName.lastIndexOf(".");
    if (delimiterIndex > 0)
        fileName = fileName.slice(0, delimiterIndex);

    return parseInt(fileName, 10);
}

const compareFunctions: CompareLookup = {
    [FilesOrder.Lexical]: (_, a, b) => a.localeCompare(b),
    [FilesOrder.Numeric]: (cache, a, b) => {
        return (cache[a] || (cache[a] = parseNumericName(a)))
             - (cache[b] || (cache[b] = parseNumericName(b)));
    },
    [FilesOrder.Tokenize]: (cache, a, b) => {
        const token = cache["param://token"];
        const av: Array<string> = cache[a] || (cache[a] = a.split(token));
        const bv: Array<string> = cache[b] || (cache[b] = b.split(token));

        for (let n = 0; n < av.length; ++n) {
            if (n >= bv.length)
                return 1;

            const diff = av[n].localeCompare(bv[n]);
            if (diff !== 0)
                return diff;
        }

        return 0;
    },
    [FilesOrder.Dimensional]: (cache, a, b) => {
        const token = cache["param://token"];
        const av: Array<number> = cache[a] || (cache[a] = a.split(token).map(parseNumericName));
        const bv: Array<number> = cache[b] || (cache[b] = b.split(token).map(parseNumericName));

        for (let n = 0; n < av.length; ++n) {
            if (n >= bv.length)
                return 1;

            const diff = av[n] - bv[n];
            if (diff !== 0)
                return diff;
        }

        return 0;
    },
};

(compareFunctions[FilesOrder.Tokenize] as CompareFunction).init =
(compareFunctions[FilesOrder.Dimensional] as CompareFunction).init = (cache, param) => {
    cache["param://token"] = param;
};

export function sortFiles(files: FilesView, order: number, pattern?: string): FilesView {
    const unsignedOrder = Math.abs(order) as FilesOrder;
    const comparer = order && compareFunctions[unsignedOrder];
    if (!comparer || files.names.length < 1)
        return files;

    const cache = {};
    if (pattern && comparer.init)
        comparer.init(cache, pattern);

    let sortedNames = files.names;
    if (!comparer.init || pattern) {
        sortedNames = sortedNames.slice(0).sort(comparer.bind(null, cache));
        if (order < 0)
            sortedNames = sortedNames.reverse();
    }

    return {
        path: files.path,
        names: sortedNames,
    };
}

interface Props {
    localPreferences: PreferenceNameSet;
    onTogglePreferenceScope(name: keyof Preferences): void;

    order: FilesOrder | number;
    onSetOrder(order: FilesOrder | number): void;

    orderParam?: string;
    onSetOrderParam(value: string): void;
}

export class Ordering extends React.PureComponent<Props> {
    private readonly toggleApproachScope: () => void;

    constructor(props: Props, context: any) {
        super(props, context);

        this.toggleApproachScope = () => this.props.onTogglePreferenceScope("order");

        this.handleSetOrder = this.handleSetOrder.bind(this);
        this.handleSetOrderParam = this.handleSetOrderParam.bind(this);
    }
    
    public render() {
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
            <li>
                <label>
                    <div>Direction</div>
                    <select value={order} onChange={this.handleSetOrder}>
                        <option value={unsignedOrder}>Ascending</option>
                        <option value={-unsignedOrder}>Descending</option>
                    </select>
                </label>
            </li>
            {requireSplitting && <li>
                <label>
                    <div>Separator</div>
                    <input placeholder="Text"
                        value={orderParam}
                        onChange={this.handleSetOrderParam} />
                </label>
            </li>}
        </ul>;
    }

    private handleSetOrder(ev: React.ChangeEvent<HTMLSelectElement>): void {
        this.props.onSetOrder(parseInt(ev.target.value));
    }

    private handleSetOrderParam(ev: React.ChangeEvent<HTMLInputElement>): void {
        this.props.onSetOrderParam(ev.target.value);
    }
}