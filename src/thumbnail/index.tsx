import "./thumbnail.sass"
import * as React from "react";

import {Image} from "./image";

interface Props {
    files: FilesView;
    index: number;
    pathFormat?: string;
    thumbnailResolution?: ThumbnailResolution;
    anchor?: boolean;
    selected?: boolean;
    onClick: (index: number, event: React.MouseEvent) => void;
}

function renderThumbnail({onClick, anchor, selected, ...props}: Props) {
    const fileName = props.files.names[props.index];

    let className = "thumbnail";
    if (anchor) className += " anchor";
    if (selected) className += " selected";

    return <li className={className} onClick={ev => onClick(props.index, ev)}>
        <Image {...props} />
        <div>{fileName}</div>
    </li>;
}

export const Thumbnail = React.memo(renderThumbnail);