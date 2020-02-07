export function isCancellation(fault: any): boolean {
    return fault.cancelled;
}
