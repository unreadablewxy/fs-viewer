import {EventEmitter} from "events";

export interface TransitionService extends EventEmitter {
    interval: number;

    setInterval(duration: number): void;

    on(event: "transition", cb: () => void): this;
    on(event: "intervalchange", cb: () => void): this;
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

    function stop() {
        if (timer !== null) {
            provider.clearInterval(timer as (number & NodeJS.Timeout));
            timer = null;
        }
    }

    function onTick() {
        service.emit("transition");
    }

    const service = Object.defineProperties(new EventEmitter(), {
        interval: {
            configurable: false,
            get: () => interval,
        },
    }) as TransitionService;

    service.setInterval = function(duration: number): void {
        if (duration === interval)
            return;

        stop();
        if (duration > 0)
            timer = provider.setInterval(onTick, duration);

        interval = duration;
        service.emit("intervalchange");
    };

    return [service, stop];
}