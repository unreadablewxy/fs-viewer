declare module "dbus-native" {

type EventHandler = () => void;

interface Interface {
    on(eventName: string, handler: EventHandler): void;

    Queue(): void;
    Dequeue(): void;
    GetSupported(): void;
    GetFlavors(): void;
}

type GetInterfaceCallback = (error: Error, interface: Interface) => void;

interface Service {
    getInterface(path: string, id: string, callback: GetInterfaceCallback): void;
}

interface SessionBus {
    getService(id: string): Service;
}

export function sessionBus(): SessionBus;
