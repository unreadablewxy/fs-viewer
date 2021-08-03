import {EventEmitter} from "events";

import {method} from "../interface";

export interface TransitionService extends EventEmitter {
    interval: number;
    scaleToFit: boolean; // This really doesn't belong here, but functionality > purity

    setInterval(duration: number): void;
    setScaleToFit(enabled: boolean): void;

    on(event: "transition", cb: () => void): this;
    on(event: "intervalchange", cb: () => void): this;
    on(event: "scalingchange", cb: () => void): this;
}

type ModeChangeCallback = () => void;

type Timer = number | NodeJS.Timeout;

type TimerProvider = {
    setInterval: (handler: TimerHandler, timeout: number) => number;
    clearInterval: (t: number) => void;
} | {
    setInterval: (handler: TimerHandler, timeout: number) => NodeJS.Timeout;
    clearInterval: (t: NodeJS.Timeout) => void;
}

export function create(provider: TimerProvider): [TransitionService, ModeChangeCallback] {
    let timer: Timer | null = null;
    let interval: number = 0;
    let scaleToFit: boolean = true;

    function stop() {
        if (timer !== null) {
            provider.clearInterval(timer as (number & NodeJS.Timeout));
            timer = null;
        }
    }

    function onTick() {
        service.emit("transition");
    }
    
    function setInterval(duration: number): void {
        if (duration === interval)
            return;

        stop();
        if (duration > 0)
            timer = provider.setInterval(onTick, duration);

        interval = duration;
        service.emit("intervalchange");
    }

    function setScaleToFit(enabled: boolean): void {
        scaleToFit = enabled;
        service.emit("scalingchange");
    }

    const service = Object.defineProperties(new EventEmitter(), {
        interval: {
            configurable: false,
            get: () => interval,
        },

        scaleToFit: {
            configurable: false,
            get: () => scaleToFit,
        },

        setInterval: { ...method, value: setInterval },
        setScaleToFit: { ...method, value: setScaleToFit },
    }) as TransitionService;

    return [service, stop];
}