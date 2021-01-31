import type {Request as Interface} from "../ipc";

const textEncoding = "utf-8";

export class Request implements Interface {
    private readonly buffer: Buffer;
    private offset: number = 0;

    constructor(
        private readonly dispatch: (buffer: Buffer) => void,
        size?: number,
    ) {
        this.buffer = Buffer.alloc(size || 1024);
    }

    public fill(): number {
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

    public addUInt16(...values: number[]): this {
        this.offset = this.addNumbers(this.offset, values, Buffer.prototype.writeUInt16LE);
        return this;
    }

    public setUInt32(offset: number, value: number): this {
        this.buffer.writeUInt32LE(value, offset);
        return this;
    }

    public setUInt16(offset: number, value: number): this {
        this.buffer.writeUInt16LE(value, offset);
        return this;
    }

    public send(): void {
        this.dispatch(this.buffer.slice(0, this.offset));
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