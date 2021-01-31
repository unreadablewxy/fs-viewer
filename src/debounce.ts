type Operation<T> = () => T | PromiseLike<T>;

export class Debounce<T> {
    private pending: Promise<T> | null;
    private readonly duration: number;

    constructor(private readonly op: Operation<T>, duration?: number) {
        this.pending = null;
        this.createTask = this.createTask.bind(this);
        this.duration = duration || 0;
    }

    public schedule(): Promise<T> {
        if (!this.pending)
            this.pending = new Promise(this.createTask);

        return this.pending;
    }

    private createTask(
        resolve: (v: T | PromiseLike<T>) => void,
        reject: (e: Error) => void,
    ): void {
        setTimeout(() => {
            try {
                resolve(this.op());
            } catch (e) {
                console.error(e);
                reject(e);
            } finally {
                this.pending = null;
            }
        }, this.duration);
    }
}