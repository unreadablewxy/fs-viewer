import * as React from "react";
import {Icon} from "@mdi/react";
import {
    mdiApplication,
    mdiFolderSettingsVariant,
} from "@mdi/js";

interface Props {
    active: boolean;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
}

export function ScopeToggle({active, onClick}: Props) {
    let tooltip: string;
    let icon: string;

    if (active) {
        tooltip = "Saved to directory";
        icon = mdiFolderSettingsVariant;
    } else {
        tooltip = "Saved to account";
        icon = mdiApplication;
    }

    return <div className="scope-toggle">
        <button onClick={onClick} title={tooltip}>
            <Icon path={icon} />
        </button>
    </div>
}