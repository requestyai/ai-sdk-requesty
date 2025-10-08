import type { LanguageModelV2FinishReason } from '@ai-sdk/provider'

export function mapRequestyFinishReason(
    finishReason: string | null | undefined,
): LanguageModelV2FinishReason {
    switch (finishReason) {
        case 'stop':
            return 'stop'
        case 'length':
        case 'max_tokens':
            return 'length'
        case 'tool_calls':
        case 'function_call':
            return 'tool-calls'
        case 'content_filter':
            return 'content-filter'
        default:
            return 'unknown'
    }
}
