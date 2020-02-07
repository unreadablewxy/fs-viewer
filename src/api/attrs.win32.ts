import {readFile, writeFile, unlink} from "fs";
import {promisify} from "util";

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
const unlinkAsync = promisify(unlink);

export function getAttr(path: string, name: string): Promise<Buffer> {
    return readFileAsync(`${path}:${name}`);
}

export function setAttr(path: string, name: string, value: Buffer): Promise<void> {
    return writeFileAsync(`${path}:${name}`, value);
}

export function removeAttr(path: string, name: string): Promise<void> {
    return unlinkAsync(`${path}:${name}`);
}
