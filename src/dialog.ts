import type {FileFilter} from "electron";

export interface Service {
    openDirectoryPrompt(): Promise<string>;
    openFilePrompt(filters: FileFilter[], multi?: boolean): Promise<string[]>;
}