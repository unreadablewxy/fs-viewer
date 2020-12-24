type DataHandler = (data: ArrayBuffer) => void;

type CloseHandler = (error: boolean) => void;

type ErrorHandler = (error: Error) => void;

export interface Request {
    fill(): number;

    addString(value: string): Request;

    addUInt32(...values: number[]): Request;
    setUInt32(offset: number, value: number): Request;

    addUInt16(...values: number[]): Request;
    setUInt16(offset: number, value: number): Request;

    send(): void;
};

interface Socket {
    on(event: "data",  handler: DataHandler): Socket;
    on(event: "close", handler: CloseHandler): Socket;
    on(event: "error", handler: ErrorHandler): Socket;
}

export interface Connection extends Socket {
    request(maxSize?: number): Request;
    close(): void;
}

export interface Service {
    connect(address: string): Promise<Connection>;
}