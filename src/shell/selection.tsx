import * as React from "react";
import {mdiSelection} from "@mdi/js";
import {Icon} from "@mdi/react";

import type {browsing} from "..";

interface Props {
    browsing: browsing.Service;
}

export class Selection extends React.PureComponent<Props> {
    readonly #forceUpdate = (): void => { this.forceUpdate(); };

    componentDidMount(): void {
        this.props.browsing.on("selectchange", this.#forceUpdate);
    }

    componentWillUnmount(): void {
        this.props.browsing.off("selectchange", this.#forceUpdate);
    }

    render(): React.ReactNode {
        const selectionSize = this.props.browsing.selected.size;

        return <li className={selectionSize < 1 ? "variadic hidden" : "variadic"}
            title={`${selectionSize} files selected`}>
            <span>
                <Icon path={mdiSelection} />
                {selectionSize > 0 && <span className="pill">{selectionSize}</span>}
            </span>
        </li>;
    }
}