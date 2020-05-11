import "./notice.sass";
import * as React from "react";
import {Icon} from "@mdi/react";

export enum Level {
    Info = 1,
    Warning,
    Error,
}

interface Props {
    children: React.ReactNode;
    title: string;
    level?: Level;
    icon?: string;
}

function renderNotice({children, title, icon, level}: Props) {
    let subClassName = (level && Level[level] || "").toLowerCase();
    return <div className={`notice ${subClassName}`}>
        <h1>
            {icon && <Icon path={icon} />}
            <span>{title}</span>
        </h1>
        <div>{children}</div>
    </div>;
}

export const Notice = React.memo(renderNotice);