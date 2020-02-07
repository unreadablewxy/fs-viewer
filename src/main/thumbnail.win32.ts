import {protocol, Request} from "electron";
import {getImageForPath, flags} from "shell-image-win";

type ResponseCallback = (response: Buffer | number) => void;

function handleThumbnailRequest(request: Request, complete: ResponseCallback): void {
    if (!request.url || request.url.length < 10) {
        complete(400);
        return;
    }

    let requestPath = request.url.slice(8).replace("/", "\\"); // len("thumb://")
    getImageForPath(requestPath, {
        width: 256,
        height: 256,
        flags: flags.BiggerSizeOk,
    }).then(complete, e => complete(500));
}

export function registerThumbnailProtocol(): void {
    protocol.registerBufferProtocol("thumb", handleThumbnailRequest as any);
}
