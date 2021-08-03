import type {FileFilter} from "electron";

export interface Service {
    openDirectoryPrompt(): Promise<string | false>;
    openFilePrompt(filters: FileFilter[], multi?: boolean): Promise<string[] | false>;
}