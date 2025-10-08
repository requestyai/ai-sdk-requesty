import type { LanguageModelV2Message } from '@ai-sdk/provider'

export function handleSystemCompletion(
    message: Extract<LanguageModelV2Message, { role: 'system' }>,
): string {
    return message.content
}
