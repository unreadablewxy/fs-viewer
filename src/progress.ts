import {EventEmitter} from "events";

export interface Task {
    promise: Promise<unknown>;
    menu?: string;
}

interface Events {
    on(event: "change", cb: (id: string) => void): this;
}

/**
 * This service tracks incomplete tasks, allowing components to recover some
 * ephemeral state between instantiations
 */
export class ProgressService extends EventEmitter implements Events {
    #store = new Map<string, Task>();

    get entries(): Iterable<[string, Task]> {
        return this.#store.entries();
    }

    get(id: string): Task | undefined {
        return this.#store.get(id);
    }

    set(id: string, promise: Promise<unknown>, menu?: string): void {
        this.#store.set(id, {
            promise,
            menu,
        });

        this.emit("change", id);

        promise.finally(() => {
            this.#store.delete(id);
            this.emit("change", id);
        });
    }
}