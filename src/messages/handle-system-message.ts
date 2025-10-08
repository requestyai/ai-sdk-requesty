import type { LanguageModelV2Message } from '@ai-sdk/provider'
import type { RequestyChatMessage } from '../types'

export function handleSystemMessage(
    message: Extract<LanguageModelV2Message, { role: 'system' }>,
): RequestyChatMessage {
    return {
        role: 'system',
        content: message.content,
    }
}
