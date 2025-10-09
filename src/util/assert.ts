export function assert(
    condition: boolean,
    message?: string,
): asserts condition is true {
    if (!condition) {
        throw new Error(message ?? 'assertion failed')
    }
}
