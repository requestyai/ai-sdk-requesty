import type { LanguageModelV2Message } from '@ai-sdk/provider'
import type { RequestyChatMessage, RequestyToolCall } from '../types'

export function handleAssistantMessage(
    message: Extract<LanguageModelV2Message, { role: 'assistant' }>,
): RequestyChatMessage {
    const assistantMessage: RequestyChatMessage = {
        role: 'assistant',
        content: null,
    }

    const containsText = message.content.some((c) => c.type === 'text')
    const text = message.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('')

    if (containsText) {
        assistantMessage.content = text
    }

    const reasoning = message.content
        .filter((c) => c.type === 'reasoning')
        .map((c) => c.text)
        .join('')
    if (reasoning.length > 0) {
        assistantMessage.reasoning = reasoning
    }

    const toolCalls: Array<RequestyToolCall> = message.content
        .filter((c) => c.type === 'tool-call')
        .map((c) => ({
            id: c.toolCallId,
            type: 'function',
            function: {
                name: c.toolName,
                arguments: JSON.stringify(c.input),
            },
        }))
    if (toolCalls.length > 0) {
        assistantMessage.tool_calls = toolCalls
    }

    return assistantMessage
}
