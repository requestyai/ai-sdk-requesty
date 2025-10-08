import type { LanguageModelV2Message } from '@ai-sdk/provider'

export function handleAssistantCompletion(
    message: Extract<LanguageModelV2Message, { role: 'assistant' }>,
    botStopSequence: string,
): string {
    const text = message.content
        .map((part) => {
            switch (part.type) {
                case 'text':
                    return part.text
                case 'reasoning':
                    return part.text
                case 'tool-call':
                    return `Function call: ${part.toolName}(${JSON.stringify(part.input)})`
                case 'file':
                    return '[File]'
                case 'tool-result':
                    return `Function result: ${JSON.stringify(part.output)}`
                default: {
                    const _exhaustiveCheck: never = part
                    throw new Error(
                        `Unsupported assistant content part: ${_exhaustiveCheck}`,
                    )
                }
            }
        })
        .join('')

    return text + botStopSequence
}
