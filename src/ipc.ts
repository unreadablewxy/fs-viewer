import type {ChildProcess} from "child_process";
import type {Socket} from "net";
import type {Writable} from "stream";

export interface Request {
    fill: number;

    addString(value: string): this;

    addUInt32(...values: number[]): this;
    setUInt32(offset: number, value: number): this;

    addUInt16(...values: number[]): this;
    setUInt16(offset: number, value: number): this;

    addUInt8(...values: number[]): this;
    setUInt8(offset: number, value: number): this;

    send(destination: Writable): void;
};

export interface Service {
    createRequest(maxSize?: number): Request;
    connect(socketPath: string): Promise<Socket>;
    spawn(executablePath: string, ...argv: string[]): ChildProcess;
}