import * as React from "react";
import {Icon} from "@mdi/react";
import {
    mdiAccount,
    mdiFolder,
} from "@mdi/js";

interface Props {
    active: boolean;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
}

export function ScopeToggle({active, onClick}: Props): JSX.Element {
    let tooltip: string;
    let icon: string;

    if (active) {
        tooltip = "Saved to directory";
        icon = mdiFolder;
    } else {
        tooltip = "Saved to account";
        icon = mdiAccount;
    }

    return <div className="scope-toggle">
        <button onClick={onClick} title={tooltip}>
            <Icon path={icon} />
        </button>
    </div>
}