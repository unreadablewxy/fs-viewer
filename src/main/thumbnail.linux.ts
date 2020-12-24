import {app, protocol, FilePathWithHeaders, ProtocolRequest} from "electron";
import {createHash} from "crypto";
import {sessionBus, Interface} from "dbus-native";
import {getType as getMimeType} from "mime";
import {join as joinPath} from "path";
import {setTimeout} from "timers";

interface DequeueRequest {
    handle: number;
}

type QueueCallback = (err: Error, handle: number) => void;

type ReadySignalHandler = (handle: number, uris: string[]) => void;

type ErrorSignalHandler = (handle: number, uris: string[], errorCode: number, message: string) => void;

interface Thumbnailer extends Interface {
    GetSupported(): void;
    GetSchedulers(): void;
    GetFlavors(): void;
    Dequeue(request: DequeueRequest): void;
    Queue(
        uris: string[],
        mimeTypes: string[],
        flavor: "normal" | string,
        scheduler: "default" | string,
        handleToDequeue: 0 | number,
        cb: QueueCallback): void;

    on(event: "Ready", handler: ReadySignalHandler): void;
    on(event: "Error", handler: ErrorSignalHandler): void;
}

const resolutionMapping: {[k in ThumbnailResolution]: string} = {
    "default": "normal",
    "high": "large",
};

type RequestCallback = (path: string | FilePathWithHeaders) => void;

interface Batch {
    paths: string[];
    mimeTypes: string[];
    callbacks: RequestCallback[];
}

function createBatch(): Batch {
    return {
        paths: [],
        mimeTypes: [],
        callbacks: [],
    };
}

interface PendingRequest {
    resolution: string;
    callback: RequestCallback;
}

const pendingRequests: {[uri: string]: PendingRequest} = {};
let unsubmitted: Batch = createBatch();
let batchTimer: NodeJS.Timeout | null = null;

function submitBatch(thumbnailer: Thumbnailer, size: ThumbnailResolution) {
    batchTimer = null;
    const batch = unsubmitted;
    unsubmitted = createBatch();
    const resolution = resolutionMapping[size] || resolutionMapping.default;

    function callback(err: Error | null) {
        if (err)
            console.error("Unable to submit thumbnailing request", err);
        else for (let n = batch.callbacks.length; n --> 0;)
            pendingRequests[batch.paths[n]] = {
                resolution,
                callback: batch.callbacks[n],
            };
    }

    thumbnailer.Queue(
        batch.paths,
        batch.mimeTypes,
        resolution,
        "foreground",
        0,
        callback);
}

function handleThumbnailRequest(
    thumbnailer: Thumbnailer,
    request: ProtocolRequest,
    callback: RequestCallback,
): void {
    const prefixLength = 8; // len("thumb://")
    let suffixOffset = request.url.indexOf("?", prefixLength);
    let size: string | undefined;
    if (suffixOffset > 0)
        size = request.url.slice(suffixOffset + 3)
    else
        suffixOffset = request.url.length;

    const path = request.url.slice(prefixLength, suffixOffset);
    const mimeType = getMimeType(path);
    if (!mimeType) return callback("");

    unsubmitted.paths.push(`file://${path}`);
    unsubmitted.mimeTypes.push(mimeType);
    unsubmitted.callbacks.push(callback);

    if (batchTimer == null)
        batchTimer = setTimeout(submitBatch, 500, thumbnailer, size);
}

function handleResponse(
    handle: number,
    uris: string[],
    process: (uri: string, pr: PendingRequest) => void,
) {
    for (let n = uris.length; n --> 0;) {
        const path = uris[n];

        const pr = pendingRequests[path];
        if (!pr) continue

        process(path, pr);
    }
}

const homePath = app.getPath("home");

function handleReady(handle: number, uris: string[]): void {
    handleResponse(handle, uris, (uri, pr) => {
        const hash = createHash("md5").update(uri).digest("hex");
        const path = `.cache/thumbnails/${pr.resolution}/${hash}.png`;
        pr.callback(joinPath(homePath, path));
    });
}

function handleError(handle: number, uris: string[]): void {
    handleResponse(handle, uris, (uri, pr) => pr.callback(""));
}

const interfaceID = "org.freedesktop.thumbnails.Thumbnailer1";
const interfacePath = "/org/freedesktop/thumbnails/Thumbnailer1";

export function registerThumbnailProtocol(): Promise<void> {
    return new Promise((resolve, reject) => {
        sessionBus()
            .getService(interfaceID)
            .getInterface<Thumbnailer>(interfacePath, interfaceID, (err, thumbnailer) => {
                if (err) {
                    reject(new Error(`Thumbnailer startup failed: ${err}`));
                } else {
                    thumbnailer.on("Error", handleError);
                    thumbnailer.on("Ready", handleReady);

                    const handler = handleThumbnailRequest.bind(null, thumbnailer);
                    protocol.registerFileProtocol("thumb", handler);
                    resolve();
                }
            });
    });
}