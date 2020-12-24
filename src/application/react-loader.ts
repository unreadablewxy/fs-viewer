import {Loader} from "inconel";

import {Extension} from "../extension";
import {importModule} from "./esimport";

// Setup a receptacle for UMD extensions
let loadedExtension: Extension | null = null;

export function isValidExtension(obj: Extension | null): obj is Extension {
    return !!(obj && obj.namespace && (
        obj.services || obj.menus || obj.extras || obj.modes
    ));
}

class ResolveUrlError extends Error {
    constructor(public readonly url: URL, message: string) {
        super(message);
    }
}

export class WebExtensionLoader implements Loader<Extension> {
    constructor(private readonly basePath: string) {}

    private nsToPathMap = new Map<string, string>();

    public async load(reference: string): Promise<Extension> {
        const modulePath = this.basePath.concat(reference, "/index.js");
        const loaded = await importModule<Extension>(modulePath);
        let module: Extension | undefined;
        if (isValidExtension(loaded))
            module = loaded;
        else if (isValidExtension(loadedExtension))
            module = loadedExtension;

        loadedExtension = null;

        if (!module)
            throw new Error("Extension does not export any expected properties");

        this.nsToPathMap.set(module.namespace, reference);
        return module;
    }

    public resolve(url: URL): string {
        switch (url.protocol) {
            case "http:":
            case "https:":
                return url.toString();

            case "extension:": {
                const ns = url.searchParams.get("namespace");
                if (!ns)
                    throw new ResolveUrlError(
                        url, "Namespace not specified for custom protocol");

                const path = this.nsToPathMap.get(ns);
                if (!path)
                    throw new ResolveUrlError(
                        url, "Unrecognized extension namespace");

                return this.basePath.concat(path, url.pathname);
            }

            default:
                throw new Error("Unsupported protocol");
        }
    }

    public static init(): void {
        Object.defineProperty(window, "extension", {
            configurable: false,
            enumerable: false,
            get: () => loadedExtension,
            set: v => { loadedExtension = v; },
        });
    }
}