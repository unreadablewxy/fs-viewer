import {Debounce} from "../debounce";

export class DeferredSaveCache<Key extends string | number, Value> {
    protected readonly values = new Map<Key, Value>();
    private readonly changed = new Set<Key>();
    private readonly saveDebounce: Debounce<void>;
    private readonly loadingTasks = new Map<Key, Promise<Value>>();

    constructor(
        private readonly load: (k: Key) => Promise<Value>,
        private readonly flush: (k: Key, v: Value) => Promise<void>,
    ) {
        this.saveDebounce = new Debounce<void>(this.onSaveTick.bind(this));
    }

    private async onSaveTick(): Promise<void> {
        for (const key of this.changed)
            this.flush(key, this.values.get(key) as Value);

        this.changed.clear();
    }

    private async beginLoad(key: Key): Promise<Value> {
        let task = this.loadingTasks.get(key);
        if (!task) {
            task = this.load(key).then(v => (this.loadingTasks.delete(key), v));
            this.loadingTasks.set(key, task);
        }

        return task;
    }

    protected markChanged(key: Key): Promise<void> {
        this.changed.add(key);
        return this.saveDebounce.schedule();
    }

    public async getOrLoad(key: Key): Promise<Value> {
        let result = this.values.get(key);
        if (!result) {
            result = await this.beginLoad(key);
            this.values.set(key, result);
        }

        return result;
    }

    public set(key: Key, value: Value): Promise<void> {
        this.values.set(key, value);
        return this.markChanged(key);
    }
}