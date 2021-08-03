import {promises as afs} from "fs";

export function getAttr(path: string, name: string): Promise<Buffer> {
    return afs.readFile(`${path}:${name}`);
}

export function setAttr(path: string, name: string, value: Buffer): Promise<void> {
    return afs.writeFile(`${path}:${name}`, value);
}

export function removeAttr(path: string, name: string): Promise<void> {
    return afs.unlink(`${path}:${name}`);
}
