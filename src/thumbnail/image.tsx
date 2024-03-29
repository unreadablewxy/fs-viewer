import * as React from "react";

import type {browsing, preference} from "..";

const fieldPattern = /\{(\w*)\}/g;

interface Props {
    files: browsing.FilesView,
    index: number,
    pathFormat?: string,
    thumbnailResolution?: preference.ThumbnailResolution;
}

// This component exists so that we don't need to evaluate regex every time
// a thumbnail needs a repaint.
function renderImage({files, index, pathFormat, thumbnailResolution}: Props) {
    const fileName = files.names[index];

    let url: string;
    if (pathFormat) {
        url = "file://" + pathFormat.replace(fieldPattern, n => {
            switch (n.slice(1, n.length - 1)) {
            case "":
            case "0":
            case "fileName":
            case "file-name":
                return fileName;

            case "1":
            case "fileStem":
            case "file-stem": {
                const extensionStart = fileName.lastIndexOf('.');
                return extensionStart === -1 ? fileName : fileName.slice(0, extensionStart);
            }

            case "directory":
                return files.path;

            default:
                return "";
            }
        });
    } else {
        const suffix = thumbnailResolution ? `?r=${thumbnailResolution}` : "";
        url = `thumb://${files.path}/${fileName}${suffix}`;
    }

    return <img src={url} alt="" />;
}

export const Image = React.memo(renderImage);