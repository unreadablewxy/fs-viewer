export interface RPCProxy {
    call(payload: Uint8Array): Promise<Uint8Array>;
    close(): void;
}

export interface ProcessResult {
    status: number;
    out: string;
    err: string;
}

// Called when the other side of the IPC socket initiates a message
export type EventListener = (data: Uint8Array) => Promise<Uint8Array>;

export interface Service {
    connect(
        socketPath: string,
        disconnect?: () => void,
        listener?: EventListener,
    ): Promise<RPCProxy>;

    spawn(
        executablePath: string, 
        listener?: EventListener,
        ...argv: string[]
    ): Promise<RPCProxy>;

    execute(executablePath: string, ...argv: string[]): Promise<ProcessResult>;
}
