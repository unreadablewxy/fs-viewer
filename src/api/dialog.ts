import {remote, OpenDialogOptions, FileFilter} from "electron";

import {Cancellation} from "./error";
export type {FileFilter};

const openDirOptions: OpenDialogOptions = {
    properties: ["openDirectory"],
};

async function openDialog(options: OpenDialogOptions) {
    const {canceled, filePaths} = await remote.dialog.showOpenDialog(
        remote.getCurrentWindow(), options);

    if (canceled) throw new Cancellation();
    return filePaths;
}

export async function openDirectoryPrompt(): Promise<string> {
    const filePaths = await openDialog(openDirOptions);
    return filePaths[0];
}

export async function openFilePrompt(filters: FileFilter[], multi?: boolean): Promise<string[]> {
    const properties: typeof options.properties = [];
    const options: OpenDialogOptions = { properties, filters };

    if (multi)
        properties.push("multiSelections");

    return await openDialog(options);
}