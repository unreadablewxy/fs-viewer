import {app, dialog, BrowserWindow, BrowserWindowConstructorOptions} from "electron";
import {join as joinPath} from "path";

import type {FileFilter, OpenDialogOptions} from "electron/main";
import {Fault, isFault} from "../ipc.contract";

interface WindowEvent {
    sender: BrowserWindow
}

export interface Status {
    maximized: boolean;
    tabletMode: boolean;
}

export interface WindowState extends Pick<BrowserWindowConstructorOptions, "x"|"y"|"width"|"height"> {
    maximized?: boolean;
}

const defaultState = Object.freeze<WindowState>({
    width: 800,
    height: 600,
});

const openDirOptions: OpenDialogOptions = {
    properties: ["openDirectory"],
};

export class ClientWindow {
    private window: BrowserWindow;

    constructor(private readonly onStateChanged: (diff: Partial<WindowState>) => void) {
        this.window = new BrowserWindow({
            frame: false,
            minWidth: 600,
            minHeight: 400,
            backgroundColor: "#000",
            show: false,
            paintWhenInitiallyHidden: true,
            webPreferences: {
                nodeIntegration: false,
                nodeIntegrationInWorker: false,
                nodeIntegrationInSubFrames: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: joinPath(app.getAppPath(), "build/api.js"),
                additionalArguments: [
                    app.getPath("home"),
                    app.getPath("appData"),
                ],
            },
        });

        this.window.setMenu(null);
        this.window.loadFile("build/index.html");

        if (BUILD_TYPE === "dev")
            this.window.webContents.openDevTools();
    
        this.window.once("closed", () => {
            // Dereference the window so it can be GC'd
            (this.window as unknown) = null;
        });
    }

    private handleWindowMove({sender}: WindowEvent): void {
        this.onStateChanged({
            ...sender.getBounds(),
            maximized: sender.isMaximized(),
        });
    }

    show(initialState: WindowState | Fault): void {
        const moveHandler = this.handleWindowMove.bind(this);
        this.window.on("move", moveHandler);
        this.window.on("resize", moveHandler);

        if (isFault(initialState))
            initialState = {}; // Window state failed to load, who cares

        const {maximized, ...bounds} = Object.assign(
            {}, defaultState, initialState);

        this.window.setBounds(bounds);

        if (maximized)
            this.window.maximize();
        else
            this.window.show();
    }

    close(): void {
        this.window.close();
    }
    
    maximize(): void {
        this.window.maximize();
    }
    
    minimize(): void {
        this.window.minimize(); 
    }

    unmaximize(): void {
        this.window.unmaximize();
    }

    getStatus(): Status {
        return {
            maximized: this.window?.isMaximized() as boolean,
            tabletMode: this.window?.isTabletMode() as boolean,
        };
    }

    private async openDialog(options: OpenDialogOptions): Promise<string[] | false> {
        const {canceled, filePaths} = await dialog.showOpenDialog(this.window as BrowserWindow, options);
        return !canceled && filePaths;
    }

    async openDirectoryPrompt(): Promise<string | false> {
        const filePaths = await this.openDialog(openDirOptions);
        return filePaths && filePaths[0];
    }

    async openFilePrompt(filters: FileFilter[], multi?: boolean): Promise<string[] | false> {
        const properties: typeof options.properties = [];
        const options: OpenDialogOptions = { properties, filters };
    
        if (multi)
            properties.push("multiSelections");
    
        return await this.openDialog(options);
    }
}