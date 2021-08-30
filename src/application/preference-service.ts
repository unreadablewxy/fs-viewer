import {EventEmitter} from "events";

import type {preference} from "..";

export function create(): [preference.Service, preference.UpdateFn] {
    const service = new EventEmitter() as preference.Service;

    function onUpdate(delta: Partial<preference.Set>, previous: preference.Set) {
        service.emit("change", delta, previous);
    }

    return [service, onUpdate];
}