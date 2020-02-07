import {app, protocol, FilePathWithHeaders, Request} from "electron";
import path from "path";
import {createHash} from "crypto";

const homePath = app.getPath("home");

function hashMD5(text: string): string {
    return createHash("md5").update(text).digest("hex");
}

function handleThumbnailRequest(
    request: Request,
    done: (response: FilePathWithHeaders) => void,
): void {
    let requestPath = request.url.slice(8); // len("thumb://")
    requestPath = path.normalize(`${__dirname}/${requestPath}`);

    let file = hashMD5(`file://${requestPath}`);
    done({ path: path.join(homePath, `.cache/thumbnails/normal/${file}.png`) });
}

export function registerThumbnailProtocol(): void {
    protocol.registerFileProtocol("thumb", handleThumbnailRequest);
}
