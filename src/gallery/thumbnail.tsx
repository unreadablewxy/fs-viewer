import * as React from "react";

const unrenderedPattern = /\{(\w*)\}/g;

function getThumbnailUrl(
    directory: string,
    fileName: string,
    format?: string
): string {
    if (format) {
        return "file://" + format.replace(unrenderedPattern, n => {
            switch (n.slice(1, n.length - 1)) {
            case "":
            case "0":
            case "fileName":
                return fileName;

            case "fileStem":
                var extensionStart = fileName.lastIndexOf('.');
                return extensionStart === -1 ? fileName : fileName.slice(0, extensionStart);

            case "directory":
                return directory;

            default:
                return "";
            }
        });
    }

    return `thumb://${directory}/${fileName}`;
}

interface Props {
    files: FilesView,
    index: number,
    pathFormat?: string,
    onClick: (index: number) => void;
}

function renderThumbnail({files, index, pathFormat, onClick}: Props) {
    const fileName = files.names[index];
    return <li className="thumbnail" onClick={() => onClick(index)}>
        <img src={getThumbnailUrl(files.path, fileName, pathFormat)} alt="" />
        <div>{fileName}</div>
    </li>;
}

export const Thumbnail = React.memo(renderThumbnail);