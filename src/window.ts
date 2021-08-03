import type {WindowStatus} from "./main";

export interface WindowService {
    on: typeof window.addEventListener;
    off: typeof window.removeEventListener;

    close(): void;
    maximize(): void;
    minimize(): void;
    unmaximize(): void;

    getStatus(): Promise<WindowStatus>;
}