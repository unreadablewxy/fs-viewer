import {promises as afs} from "fs";

import {Debounce} from "../debounce";
import {ErrorCode, Fault} from "../ipc.contract";
import {getAttr, removeAttr, setAttr} from "./attrs";

const textEncoding = "utf-8";

interface FileSystem {
    flush(directory?: string): Promise<void>;

    setAttribute(path: string, name: string, value: ArrayBuffer): void;
    getAttribute(path: string, name: string): Promise<ArrayBuffer | Fault>;
    removeAttribute(path: string, name: string): void;

    loadObject(path: string): Promise<Record<string, unknown> | Fault>;
    patchObject(path: string, patch: Record<string, unknown>): Promise<void>;

    loadTextFile(path: string): Promise<string[] | Fault>;
    patchTextFile(path: string, patch: Record<number, string>): Promise<void>;
}

function attrKey(path: string, attr: string): string {
    return `${path}\n${attr}`;
}

interface CachedValue<D> {
    changed: boolean;
    data: D;
}

export class CachedFileSystem implements FileSystem {
    readonly attrs = new Map<string, CachedValue<ArrayBuffer>>();
    readonly objects = new Map<string, CachedValue<Record<string, unknown>>>();
    readonly texts = new Map<string, CachedValue<Array<string>>>();
    private readonly save = new Debounce(() => this.flush(), 5000);

    removeAttribute(path: string, name: string): void {
        this.attrs.set(attrKey(path, name), {data: new ArrayBuffer(0), changed: true});
        this.save.schedule();
    }

    setAttribute(path: string, name: string, value: ArrayBuffer): void {
        this.attrs.set(attrKey(path, name), {data: value, changed: true});
        this.save.schedule();
    }

    async getAttribute(path: string, name: string): Promise<ArrayBuffer | Fault> {
        const k = attrKey(path, name);
        let value = this.attrs.get(k);
        if (!value) {
            let contents: Buffer;
            try {
                contents = await getAttr(path, name);
            } catch (e) {
                if (e.code === "ENODATA" || e.code === "ENOENT")
                    return {code: ErrorCode.NotFound};

                return {code: ErrorCode.IOError};
            }

            let data = contents.buffer;
            if (contents.byteLength !== data.byteLength)
                data = data.slice(
                    contents.byteOffset,
                    contents.byteOffset + contents.byteLength,
                );

            value = {changed: false, data};

            this.attrs.set(k, value);
        }

        return value.data;
    }

    private async ensureObjectLoaded(path: string): Promise<CachedValue<Record<string, unknown>> | ErrorCode> {
        let value = this.objects.get(path);
        if (!value) {
            let content: string;
            try {
                content = await afs.readFile(path, textEncoding);
            } catch (e) {
                if (e.code === "ENODATA" || e.code === "ENOENT")
                    return ErrorCode.NotFound;

                return ErrorCode.IOError;
            }

            try {
                value = {
                    changed: false,
                    data: (JSON.parse(content) || {}) as Record<string, unknown>,
                };
            } catch (e) {
                return ErrorCode.DataFormat;
            }

            this.objects.set(path, value);
        }

        return value;
    }

    async loadObject(path: string): Promise<Record<string, unknown> | Fault> {
        const value = await this.ensureObjectLoaded(path);
        return typeof value === "number"
            ? {code: value as ErrorCode}
            : value.data;
    }

    async patchObject(path: string, patch: Record<string, unknown>): Promise<void> {
        const value = await this.ensureObjectLoaded(path);
        if (typeof value === "number") {
            this.objects.set(path, {
                changed: true,
                data: patch,
            });
        } else {
            Object.assign(value.data, patch);
            value.changed = true;
        }

        this.save.schedule();
    }

    private async ensureTextLoaded(path: string): Promise<CachedValue<Array<string>> | ErrorCode> {
        let file = this.texts.get(path);
        if (!file) {
            let content: string;
            try {
                content = await afs.readFile(path, textEncoding);
            } catch (e) {
                if (e.code === "ENODATA" || e.code === "ENOENT")
                    return ErrorCode.NotFound;

                return ErrorCode.IOError;
            }

            file = {
                changed: false,
                data: content.split("\n"),
            };

            this.texts.set(path, file);
        }

        return file;
    }

    async loadTextFile(path: string): Promise<string[] | Fault> {
        const file = await this.ensureTextLoaded(path);
        return typeof file === "number"
            ? {code: file as ErrorCode}
            : file.data;
    }

    async patchTextFile(path: string, patch: Record<number, string>): Promise<void> {
        let file = await this.ensureTextLoaded(path);
        if (typeof file === "number") {
            file = {
                changed: true,
                data: [],
            };

            this.texts.set(path, file);
        }

        for (const key in patch)
            file.data[key] = patch[key];

        file.changed = true;
        this.save.schedule();
    }

    private flushAttr(path: string, name: string, entry: CachedValue<ArrayBuffer>): Promise<void> {
        if (entry.data.byteLength)
            return setAttr(path, name, Buffer.from(entry.data)).
                finally(() => { entry.changed = false; });

        return removeAttr(path, name).then(
            () => { this.attrs.delete(attrKey(path, name)); },
            e => (e.code === "ENODATA" || e.code === "ENOENT") ? undefined : Promise.reject(e)
        );
    }

    private flushObject(path: string, entry: CachedValue<Record<string, unknown>>): Promise<void> {
        return afs.writeFile(path, JSON.stringify(entry.data)).
            finally(() => entry.changed = false);
    }

    private flushTextFile(path: string, entry: CachedValue<Array<string>>): Promise<void> {
        return afs.writeFile(path, entry.data.join("\n")).
            finally(() => entry.changed = false);
    }

    flush(directory?: string): Promise<void> {
        const tasks = new Array<Promise<void>>();
        for (const [key, entry] of this.attrs.entries())
            if (entry.changed) {
                const separator = key.lastIndexOf("\n");
                separator > 0 && tasks.push(this.flushAttr(
                    key.slice(0, separator),
                    key.slice(separator + 1),
                    entry));
            }

        for (const [path, entry] of this.texts.entries())
            if (entry.changed)
                tasks.push(this.flushTextFile(path, entry));

        for (const [path, entry] of this.objects.entries())
            if (entry.changed)
                tasks.push(this.flushObject(path, entry));

        return Promise.all<void>(tasks) as unknown as Promise<void>;
    }
}