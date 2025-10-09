export function assertDefined<T>(
    value: T | undefined,
    message?: string,
): asserts value is T {
    if (value == null) {
        throw new Error(message ?? 'value cannot be undefined')
    }
}
