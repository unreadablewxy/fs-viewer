import {remote} from "electron";

window.addEventListener("keydown", ev => {
    if (ev.key === "F12")
        remote.getCurrentWindow().webContents.openDevTools();
});

["maximize", "unmaximize"].forEach(eventName => {
    // TypeScript can't properly deduces constant arg types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    remote.getCurrentWindow().on(eventName as any, () => {
        const event = new CustomEvent(eventName);
        window.dispatchEvent(event);
    });
});

export function setMaximized(maxized: boolean): void {
    const window = remote.getCurrentWindow();
    if (maxized)
        window.maximize();
    else
        window.unmaximize();
}

export function minimize(): void {
    remote.getCurrentWindow().minimize();
}

export function closeWindow(): void {
    remote.getCurrentWindow().close();
}
