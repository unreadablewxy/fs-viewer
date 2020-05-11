import * as React from "react";

const fieldPattern = /\{(\w*)\}/g;

interface Props {
    files: FilesView,
    index: number,
    pathFormat?: string,
}

// This component exists so that we don't need to evaluate regex every time
// a thumbnail needs a repaint.
function renderImage({files, index, pathFormat}: Props) {
    const fileName = files.names[index];

    let url: string;
    if (pathFormat) {
        url = "file://" + pathFormat.replace(fieldPattern, n => {
            switch (n.slice(1, n.length - 1)) {
            case "":
            case "0":
            case "fileName":
                return fileName;

            case "1":
            case "fileStem":
                var extensionStart = fileName.lastIndexOf('.');
                return extensionStart === -1 ? fileName : fileName.slice(0, extensionStart);

            case "directory":
                return files.path;

            default:
                return "";
            }
        });
    } else {
        url = `thumb://${files.path}/${fileName}`;
    }

    return <img src={url} alt="" />;
}

export const Image = React.memo(renderImage);