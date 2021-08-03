// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function isCancellation(fault: any): boolean {
    return fault.cancelled;
}

const excludedErrorProperties: {[k in string]: 1} = {
    message: 1,
    stack: 1,
    name: 1,
};

export function stringifyError(err: Error): string {
    let result = err.message;

    for (const n of Object.getOwnPropertyNames(err))
        if (!excludedErrorProperties[n])
            result += `\n\t${n}: ${JSON.stringify(err[n as keyof Error])}`;

    return result;
}