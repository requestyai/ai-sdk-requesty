import type {
    LanguageModelV2Message,
    LanguageModelV2Prompt,
} from '@ai-sdk/provider'
import { handleAssistantCompletion } from './handle-assistant-completion'
import { handleSystemCompletion } from './handle-system-completion'
import { handleToolCompletion } from './handle-tool-completion'
import { handleUserCompletion } from './handle-user-completion'

function handleMessage(
    message: LanguageModelV2Message,
    options: {
        botStopSequence: string
        userStopSequence: string
    },
): string {
    switch (message.role) {
        case 'system':
            return handleSystemCompletion(message)
        case 'user':
            return handleUserCompletion(message, options.userStopSequence)
        case 'assistant':
            return handleAssistantCompletion(message, options.botStopSequence)
        case 'tool':
            return handleToolCompletion(message)
    }
}

export function convertToRequestyCompletionPrompt(
    prompt: LanguageModelV2Prompt,
    options?: {
        botStopSequence?: string
        userStopSequence?: string
    },
): string {
    const { botStopSequence = '</s>', userStopSequence = '' } = options ?? {}

    return prompt
        .map((message) =>
            handleMessage(message, { botStopSequence, userStopSequence }),
        )
        .join('')
}
