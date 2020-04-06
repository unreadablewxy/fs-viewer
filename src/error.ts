export function isCancellation(fault: any): boolean {
    return fault.cancelled;
}
// benign change to test CI
