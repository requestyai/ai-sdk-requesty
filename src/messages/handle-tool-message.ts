import type {
    LanguageModelV2Message,
    LanguageModelV2ToolResultPart,
} from '@ai-sdk/provider'
import type { RequestyChatMessage } from '../types'

export function handleToolContentPart(
    contentPart: LanguageModelV2ToolResultPart,
): string {
    switch (contentPart.output.type) {
        case 'error-text':
        case 'text':
            return contentPart.output.value
        case 'error-json':
        case 'json':
            return JSON.stringify(contentPart.output.value)
        case 'content':
            return contentPart.output.value
                .filter((c) => c.type === 'text')
                .map((c) => c.text)
                .join('')
    }
}

export function handleToolMessage(
    message: Extract<LanguageModelV2Message, { role: 'tool' }>,
): Array<RequestyChatMessage> {
    return message.content.map((c) => ({
        role: 'tool',
        content: handleToolContentPart(c),
        tool_call_id: c.toolCallId,
    }))
}
