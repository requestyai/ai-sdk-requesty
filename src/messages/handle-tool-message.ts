import type {
    LanguageModelV3Message,
    LanguageModelV3ToolApprovalResponsePart,
    LanguageModelV3ToolResultPart,
} from '@ai-sdk/provider'
import type { RequestyChatMessage } from '../types'

export function handleToolContentPart(
    contentPart:
        | LanguageModelV3ToolResultPart
        | LanguageModelV3ToolApprovalResponsePart,
): string {
    if (contentPart.type === 'tool-result') {
        switch (contentPart.output.type) {
            case 'error-text':
            case 'text':
                return contentPart.output.value
            case 'error-json':
            case 'json':
                return JSON.stringify(contentPart.output.value)
            case 'execution-denied':
                return contentPart.output.reason ?? 'Execution denied'
            case 'content':
                return contentPart.output.value
                    .filter((c) => c.type === 'text')
                    .map((c) => c.text)
                    .join('')
        }
    } else {
        return 'TODO: implement tool approval flow'
    }
}

export function handleToolMessage(
    message: Extract<LanguageModelV3Message, { role: 'tool' }>,
): Array<RequestyChatMessage> {
    return message.content.map((c) => ({
        role: 'tool',
        content: handleToolContentPart(c),

        // TODO: implement tool approval flow
        tool_call_id: c.type === 'tool-result' ? c.toolCallId : undefined,
    }))
}
