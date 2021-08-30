import {execFile} from "child_process";
import {existsSync} from "fs";
import {createConnection as createNetConnection} from "net";
import {normalize, isAbsolute} from "path";

import type {Readable, Writable} from "stream";
import type {ipc} from "..";

function assertPath(maybePath: string): string {
    maybePath = normalize(maybePath);
    if (!isAbsolute(maybePath) || !existsSync(maybePath))
        throw new Error("A file system path is required");

    return maybePath;
}

const EnvelopeSize = 8;

/**
 * Implements request multiplexing for multiple RPC proxies.
 * 
 * The protocol is pretty simple, every message is enveloped in 2 fields:
 *      UInt32 callID
 *      UInt32 payloadBytesSize
 * 
 * Call IDs allows multiple overlapped requests to be dispatched and serviced
 * simultaneously. Both the request and response that comprises a RPC Call must
 * be identified by the same call ID.
 * 
 * To simplify synchronization on both sides, odd call IDs always denote a call
 * that was initiated by this program. Even call IDs denotes the alternative.
 */
class Connection {
    private refCount = 0;

    // All client sent IDs are odd, all remote IDs are even
    private nextCallID = 1;
    private responseHandlers = new Map<number, (data: Uint8Array) => void>();
    private readonly envelope = new Uint32Array(2);

    // The parts of a multi-part message
    private receivedParts: Uint8Array[] = [];

    // How many more bytes are needed before the next message is fully received
    private receiveDue: number = 0;

    constructor(
        private readonly input: Readable,
        private readonly output: Writable,
        private readonly close: () => void,
        private readonly listener?: ipc.Listener,
    ) {
        this.input.on("data", this.onData.bind(this));
    }

    public createProxy(): ipc.RPCProxy {
        const proxy: ipc.RPCProxy = {
            call: this.sendAndReceive.bind(this),
            close: this.release.bind(this),
        };

        ++this.refCount;
        return proxy;
    }

    private async onData(data: Uint8Array): Promise<void> {
        if (this.receiveDue) {
            this.receivedParts.push(data);

            if (this.receiveDue > data.byteLength) {
                // Still need to read more, add this to the pile and wait
                this.receiveDue -= data.byteLength;
                return;
            } else {
                data = Buffer.concat(this.receivedParts);
                this.receiveDue = 0;
            }
        }

        // The data received might be multiple messages concatenated
        do {
            const view = new DataView(data.buffer);
            const messageLength = view.getUint32(4, true);

            // Handle incomplete message
            if (messageLength > data.byteLength) {
                this.receiveDue = messageLength - data.byteLength;
                this.receivedParts = [data];
                return;
            }

            const messageID = view.getUint32(0, true);
            if (messageID & 1) {
                // Handle a call response
                const handler = this.responseHandlers.get(messageID);
                if (handler) {
                    handler(data.subarray(EnvelopeSize));
                    this.responseHandlers.delete(messageID);
                } else
                    console.warn(`No handler registered for response message ${messageID}`);
            } else if (this.listener) {
                const reply = await this.listener(data);
                if (reply) {
                    this.envelope[0] = messageID;
                    this.envelope[1] = EnvelopeSize + reply.length;
                    this.output.write(new Uint8Array(this.envelope.buffer));
                    this.output.write(reply);
                }
            }

            data = data.subarray(messageLength);
        } while (data.byteLength);
    }

    private sendAndReceive(payload: Uint8Array): Promise<Uint8Array> {
        const callID = this.nextCallID;
        this.nextCallID = callID > (1 << 31) ? 1 : callID + 2;
        this.envelope[0] = callID;
        this.envelope[1] = EnvelopeSize + payload.length;
        this.output.write(new Uint8Array(this.envelope.buffer));
        this.output.write(payload);
        return new Promise((resolve) => {
            // TODO: Implement timeouts
            this.responseHandlers.set(callID, resolve);
        });
    }

    private release(): void {
        if (--this.refCount === 0)
            this.close();
    }
}

const connections = new Map<string, Connection>();

export function createIPCConnection(
    socketPath: string,
    disconnect?: () => void,
    listener?: ipc.Listener,
): Promise<ipc.RPCProxy> {
    socketPath = assertPath(socketPath);

    const existing = connections.get(socketPath);
    if (existing)
        return Promise.resolve(existing.createProxy());

    return new Promise<ipc.RPCProxy>((resolve, reject) => {
        const socket = createNetConnection(socketPath);

        function close(): void {
            socket.destroy();
            connections.delete(socketPath);
        }

        socket.once("error", reject);

        socket.once("connect", () => {
            socket.removeListener("error", reject);

            const connection = new Connection(socket, socket, close, listener);

            if (disconnect)
                socket.on("close", disconnect);

            connections.set(socketPath, connection);
            resolve(connection.createProxy());
        });
    });
}

export function createWorkerProcess(
    executablePath: string,
    listener?: ipc.Listener,
    ...args: string[]
): Promise<ipc.RPCProxy> {
    executablePath = assertPath(executablePath);

    const process = execFile(executablePath, args);
    const {stdout, stdin} = process;
    if (!stdout || !stdin)
        throw new Error("Unable to communicate with spawned process");

    function close(): void {
        stdin && stdin.destroy();
    }

    const connection = new Connection(stdout, stdin, close, listener);
    return Promise.resolve(connection.createProxy());
}

export function executeProgram(
    executablePath: string,
    ...args: string[]
): Promise<ipc.ProcessResult> {
    executablePath = assertPath(executablePath);

    return new Promise((resolve, reject) => {
        const process = execFile(executablePath, args, (err, stdout, stderr) => {
            if (err)
                return reject(err);

            resolve({
                status: process.exitCode || 0,
                out: stdout,
                err: stderr,
            });
        });
    });
}
