type VisitFn<T> = (value: T, line: string) => boolean;

export interface Service {
    joinPath(...parts: string[]): string;
    reduceTextFile<T>(path: string, visitor: VisitFn<T>, initial: T): Promise<T>
}