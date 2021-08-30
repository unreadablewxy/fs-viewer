import {protocol, ProtocolRequest, ProtocolResponse} from "electron";
import {getImageForPath, flags} from "shell-image-win";

import type {preference} from "..";

type ResponseCallback = (response: (Buffer) | (ProtocolResponse)) => void;

const resolutionMapping: {[k in preference.ThumbnailResolution]: number} = {
    "default": 256,
    "high": 400,
};

function handleThumbnailRequest(request: ProtocolRequest, complete: ResponseCallback): void {
    if (!request.url || request.url.length < 10) {
        complete({ statusCode: 400 });
        return;
    }

    const prefixLength = 8; // len("thumb://")
    let suffixOffset = request.url.indexOf("?", prefixLength);
    let size: string | undefined;
    if (suffixOffset > 0)
        size = request.url.slice(suffixOffset + 3)
    else
        suffixOffset = request.url.length;

    const resolution = resolutionMapping[size as preference.ThumbnailResolution] || resolutionMapping.default;
    const requestPath = request.url.slice(prefixLength, suffixOffset)
        .replace("/", "\\");

    getImageForPath(requestPath, {
        width: resolution,
        height: resolution,
        flags: flags.BiggerSizeOk,
    }).then(complete, () => complete({ statusCode: 500 }));
}

export function registerThumbnailProtocol(): Promise<void> {
    protocol.registerBufferProtocol("thumb", handleThumbnailRequest);
    return Promise.resolve();
}
