import type { LanguageModelV3Message } from '@ai-sdk/provider'
import type { RequestyChatMessage } from '../types'

export function handleSystemMessage(
    message: Extract<LanguageModelV3Message, { role: 'system' }>,
): RequestyChatMessage {
    return {
        role: 'system',
        content: message.content,
    }
}
