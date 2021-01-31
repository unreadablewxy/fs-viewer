import {execFile, ChildProcess} from "child_process";
import {existsSync} from "fs";
import {Socket, createConnection as createNetConnection} from "net";
import {normalize, isAbsolute} from "path";
import type {Writable} from "stream";

import type {Request as RequestShape} from "../ipc";

const textEncoding = "utf-8";

export class Request implements RequestShape {
    private readonly buffer: Buffer;
    private offset: number = 0;

    constructor(size?: number) {
        this.buffer = Buffer.alloc(size || 1024);
    }

    public get fill(): number {
        return this.offset;
    }

    public addString(value: string): this {
        this.offset += this.buffer.write(value, this.offset, textEncoding);
        return this;
    }

    public addUInt32(...values: number[]): this {
        this.offset = this.addNumbers(this.offset, values, Buffer.prototype.writeUInt32LE);
        return this;
    }

    public setUInt32(offset: number, value: number): this {
        this.buffer.writeUInt32LE(value, offset);
        return this;
    }

    public addUInt16(...values: number[]): this {
        this.offset = this.addNumbers(this.offset, values, Buffer.prototype.writeUInt16LE);
        return this;
    }

    public setUInt16(offset: number, value: number): this {
        this.buffer.writeUInt16LE(value, offset);
        return this;
    }

    public addUInt8(...values: number[]): this {
        this.offset = this.addNumbers(this.offset, values, Buffer.prototype.writeUInt8);
        return this;
    }

    public setUInt8(offset: number, value: number): this {
        this.buffer.writeUInt8(value, offset);
        return this;
    }

    public send(stream: Writable): void {
        stream.write(this.buffer.slice(0, this.offset));
    }

    private addNumbers(
        offset: number,
        values: number[],
        writeOnce: (value: number, offset: number) => number,
    ): number {
        for (let n = 0; n < values.length; ++n)
            offset = writeOnce.call(this.buffer, values[n], offset);

        return offset;
    }
}

function assertPath(maybePath: string): string {
    maybePath = normalize(maybePath);
    if (!isAbsolute(maybePath) || !existsSync(maybePath))
        throw new Error("A file system path is required");

    return maybePath;
}

export function createIPCConnection(path: string): Promise<Socket> {
    path = assertPath(path);

    return new Promise<Socket>((resolve, reject) => {
        const socket = createNetConnection(path);

        socket.once("error", reject);

        socket.once("connect", () => {
            socket.removeListener("error", reject);
            resolve(socket);
        });
    });
}

export function spawnChildProcess(executable: string, ...args: string[]): ChildProcess {
    executable = assertPath(executable);
    return execFile(executable, args);
}