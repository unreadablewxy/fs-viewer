import {protocol, Request} from "electron";
import {getImageForPath, flags} from "shell-image-win";

type ResponseCallback = (response: Buffer | number) => void;

const resolutionMapping: {[k in ThumbnailResolution]: number} = {
    "default": 256,
    "high": 400,
};

function handleThumbnailRequest(request: Request, complete: ResponseCallback): void {
    if (!request.url || request.url.length < 10) {
        complete(400);
        return;
    }

    const suffixIndex = request.url.indexOf("?", 8);
    const size = suffixIndex > 0 && request.url.slice(suffixIndex + 3);
    const resolution = resolutionMapping[size as ThumbnailResolution] || 256;
    const requestPath = request.url.slice(8 /* len("thumb://") */, suffixIndex)
        .replace("/", "\\");

    getImageForPath(requestPath, {
        width: resolution,
        height: resolution,
        flags: flags.BiggerSizeOk,
    }).then(complete, () => complete(500));
}

export function registerThumbnailProtocol(): void {
    protocol.registerBufferProtocol("thumb", handleThumbnailRequest as any);
}
