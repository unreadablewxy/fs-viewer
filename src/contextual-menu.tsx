import "./contextual-menu.sass";
import {Icon} from "@mdi/react";
import * as React from "react";

import {sinkEvent} from "./event";

function renderItem({
    icon,
    children,
    onClick,
}: {
    icon?: string,
    children: React.ReactNode,
    onClick: (ev: React.MouseEvent) => void,
}) {
    return <li onClick={onClick}>
        <Icon path={icon || ""} />
        <span>{children}</span>
    </li>
}

export const Item = React.memo(renderItem);

export function Divider(): JSX.Element {
    return <li className="divider" />;
}

export interface Position {
    x: number;
    y: number;
}

function renderMenu({
    position: {x, y},
    children,
}: {
    position: Position,
    children: React.ReactNode,
}) {
    const styles = {top: `${y + 1}px`, left: `${x + 1}px`};
    return <ul className="menu contextual"
        style={styles}
        onMouseDown={sinkEvent}
    >
        {children}
    </ul>;
}

export const Menu = React.memo(renderMenu);