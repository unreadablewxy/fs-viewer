import {EventEmitter} from "events";

type UpdateFn = (delta: Partial<Preferences>, previous: Preferences) => void;

// Meant for persisted preferences that has a mutative effect on service state
// this serves as a notifier that fires whenever a preference changes
export interface PreferenceService extends EventEmitter {
    on(event: "change", cb: UpdateFn): this;
}

export function create(): [PreferenceService, UpdateFn] {
    const service = new EventEmitter() as PreferenceService;

    function onUpdate(delta: Partial<Preferences>, previous: Preferences) {
        service.emit("change", delta, previous);
    }

    return [service, onUpdate];
}