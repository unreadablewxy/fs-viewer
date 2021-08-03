export interface Service {
    setAttr(path: string, name: string, value: ArrayBuffer): Promise<void>;
    removeAttr(path: string, name: string): Promise<void>;

    patchObject(directory: string, file: string, patch: Record<string, unknown>): Promise<void>;

    patchTextFile(path: string, patch: Record<number, string>): Promise<void>;

    // Asks all data be evicted out of the cache, useful for when a directory
    // is no longer opened
    flush(directory: string): Promise<void>;
}