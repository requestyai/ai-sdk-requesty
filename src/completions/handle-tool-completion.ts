import type { LanguageModelV2Message } from '@ai-sdk/provider'

export function handleToolCompletion(
    message: Extract<LanguageModelV2Message, { role: 'tool' }>,
): string {
    const text = message.content
        .map((part) => {
            if (part.type === 'tool-result') {
                if (part.output.type === 'text') {
                    return part.output.value
                } else if (part.output.type === 'json') {
                    return JSON.stringify(part.output.value)
                } else if (part.output.type === 'error-text') {
                    return `Error: ${part.output.value}`
                } else if (part.output.type === 'error-json') {
                    return `Error: ${JSON.stringify(part.output.value)}`
                } else if (part.output.type === 'content') {
                    return part.output.value
                        .map((contentPart) => {
                            if (contentPart.type === 'text') {
                                return contentPart.text
                            } else if (contentPart.type === 'media') {
                                return `[Media: ${contentPart.mediaType}]`
                            }
                            return ''
                        })
                        .join('\n')
                } else {
                    const _exhaustiveCheck: never = part.output
                    throw new Error(
                        `Unsupported tool result output: ${_exhaustiveCheck}`,
                    )
                }
            }
            return ''
        })
        .join('')

    return text
}
