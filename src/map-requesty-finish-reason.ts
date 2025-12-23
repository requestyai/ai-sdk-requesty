import type { LanguageModelV3FinishReason } from '@ai-sdk/provider'

export function mapRequestyFinishReason(
    finishReason: string | undefined,
): LanguageModelV3FinishReason {
    switch (finishReason) {
        case 'stop':
            return { unified: 'stop', raw: finishReason }
        case 'length':
        case 'max_tokens':
            return { unified: 'length', raw: finishReason }
        case 'tool_calls':
        case 'function_call':
            return { unified: 'tool-calls', raw: finishReason }
        case 'content_filter':
            return { unified: 'content-filter', raw: finishReason }
        default:
            return { unified: 'other', raw: finishReason }
    }
}
