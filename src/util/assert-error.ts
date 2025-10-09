export function assertError(err: unknown): asserts err is Error {
    if (!(err instanceof Error)) {
        throw new Error('err is not an instance of Error')
    }
}
