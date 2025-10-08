import type {
    LanguageModelV2Message,
    LanguageModelV2Prompt,
} from '@ai-sdk/provider'
import type { RequestyChatMessage, RequestyChatPrompt } from '../types'
import { handleAssistantMessage } from './handle-assistant-message'
import { handleSystemMessage } from './handle-system-message'
import { handleToolMessage } from './handle-tool-message'
import { handleUserMessage } from './handle-user-message'

function handleMessage(
    message: LanguageModelV2Message,
): Array<RequestyChatMessage> {
    switch (message.role) {
        case 'system':
            return [handleSystemMessage(message)]
        case 'user':
            return [handleUserMessage(message)]
        case 'assistant':
            return [handleAssistantMessage(message)]
        case 'tool':
            return handleToolMessage(message)
    }
}

export function convertToRequestyChatMessages(
    prompt: LanguageModelV2Prompt,
): RequestyChatPrompt {
    return prompt.flatMap(handleMessage)
}
