import * as React from "react";
import {mdiLoading} from "@mdi/js";
import {Icon} from "@mdi/react";

interface Props {
    id: string;
    label: string;
    icon: string;
    visible?: boolean;
    busy?: boolean;
    onClick: (id: string) => void;
}

function renderButton({id, label, icon, visible, busy, onClick}: Props) {
    return <li
        className={visible ? undefined : "hidden"}
        title={label}
        onClick={() => onClick(id)}
    >
        {busy
            ? <Icon path={mdiLoading} className="icon-spin" />
            : <Icon path={icon} />}
    </li>;
}

export const MenuButton = React.memo(renderButton);