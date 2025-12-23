import type { LanguageModelV3Usage } from '@ai-sdk/provider'
import type { z } from 'zod'
import type { RequestyUsageSchema } from './schema'

export const adaptUsage = (
    requestyUsage: z.infer<typeof RequestyUsageSchema>,
): LanguageModelV3Usage => {
    const promptTokens = requestyUsage?.prompt_tokens ?? 0
    const cachedTokens =
        requestyUsage?.prompt_tokens_details?.cached_tokens ?? 0
    const cachingTokens =
        requestyUsage?.prompt_tokens_details?.caching_tokens ?? 0

    const completionTokens = requestyUsage?.completion_tokens ?? 0

    return {
        inputTokens: {
            total: promptTokens,
            cacheRead: cachedTokens,
            cacheWrite: cachingTokens,
            noCache: promptTokens - cachedTokens,
        },
        outputTokens: {
            total: completionTokens,
            text: completionTokens,

            // TODO adapt reasoning usage
            reasoning: 0,
        },
    }
}
