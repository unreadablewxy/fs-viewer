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
    return <div className="scope-toggle">
        <button onClick={onClick}>
            <Icon path={active ? mdiFolderSettingsVariant : mdiApplication} />
        </button>
    </div>
}