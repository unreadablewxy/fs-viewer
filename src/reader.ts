import type {Dirent, Stats} from "fs";

type VisitFn<T> = (value: T, line: string) => boolean;

export interface Service {
    joinPath(...parts: string[]): string;

    getStat(path: string): Promise<Stats>;
    readDirectory(path: string): Promise<ReadonlyArray<Dirent>>;

    getAttr(path: string, name: string): Promise<ArrayBuffer>;
    loadObject(directory: string, file: string): Promise<Record<string, unknown>>;
    loadTextFile(path: string): Promise<string[]>;
    reduceTextFile<T>(path: string, visitor: VisitFn<T>, initial: T): Promise<T>;
}