declare module "dbus-native" {
    type EventHandler = () => void;

    interface Interface {
        on(eventName: string, handler: EventHandler): void;
    }

    type GetInterfaceCallback<T extends Interface> = (error: Error, interface: T) => void;

    interface Service {
        getInterface<T extends Interface>(
            path: string,
            id: string,
            callback: GetInterfaceCallback<T>): void;
    }

    interface SessionBus {
        getService(id: string): Service;
    }

    export function sessionBus(): SessionBus;
}