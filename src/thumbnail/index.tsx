import "./thumbnail.sass"
import * as React from "react";

import {Image} from "./image";
import type {browsing, preference} from "..";

interface Props {
    files: browsing.FilesView;
    index: number;
    pathFormat?: string;
    thumbnailResolution?: preference.ThumbnailResolution;
    anchor?: boolean;
    selected?: boolean;
    onClick: (index: number, select: boolean, event: React.MouseEvent) => void;
}

function renderThumbnail({onClick, anchor, selected, ...props}: Props) {
    const fileName = props.files.names[props.index];

    let className = "thumbnail";
    if (anchor) className += " anchor";
    if (selected) className += " selected";

    function handleClick(ev: React.MouseEvent<HTMLElement>): void {
        if (ev.target === ev.currentTarget)
            onClick(props.index, ev.currentTarget.tagName === "DIV", ev);
    }

    return <li className={className} onClick={handleClick}>
        <Image {...props} />
        <div onClick={handleClick}>{fileName}</div>
    </li>;
}

export const Thumbnail = React.memo(renderThumbnail);