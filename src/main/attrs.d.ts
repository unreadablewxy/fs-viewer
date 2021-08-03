export function getAttr(path: string, name: string): Promise<Buffer>;
export function setAttr(path: string, name: string, value: Buffer): Promise<void>;
export function removeAttr(path: string, name: string): Promise<void>;
