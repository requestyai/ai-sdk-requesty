import type { LanguageModelV2Message } from '@ai-sdk/provider'

export function handleUserCompletion(
    message: Extract<LanguageModelV2Message, { role: 'user' }>,
    userStopSequence: string,
): string {
    const text = message.content
        .map((part) => {
            switch (part.type) {
                case 'text':
                    return part.text
                case 'file':
                    if (part.data instanceof URL) {
                        return part.data.toString()
                    } else if (part.data instanceof Uint8Array) {
                        return '[Binary file]'
                    } else {
                        return part.data
                    }
                default: {
                    const _exhaustiveCheck: never = part
                    throw new Error(
                        `Unsupported user content part: ${_exhaustiveCheck}`,
                    )
                }
            }
        })
        .join('')

    return text + userStopSequence
}
