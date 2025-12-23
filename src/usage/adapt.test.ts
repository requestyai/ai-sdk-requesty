import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import { adaptUsage } from './adapt'
import type { RequestyUsageSchema } from './schema'

describe('getUsage', () => {
    it('converts requesty usage with all fields populated', () => {
        const requestyUsage: z.infer<typeof RequestyUsageSchema> = {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
            prompt_tokens_details: {
                cached_tokens: 20,
                caching_tokens: 10,
            },
        }

        const result = adaptUsage(requestyUsage)

        expect(result).toStrictEqual({
            inputTokens: {
                total: 100,
                cacheRead: 20,
                cacheWrite: 10,
                noCache: 80,
            },
            outputTokens: {
                total: 50,
                text: 50,
                reasoning: 0,
            },
        })
    })

    it('handles usage with no cache details', () => {
        const requestyUsage: z.infer<typeof RequestyUsageSchema> = {
            prompt_tokens: 100,
            completion_tokens: 50,
        }

        const result = adaptUsage(requestyUsage)

        expect(result).toStrictEqual({
            inputTokens: {
                total: 100,
                cacheRead: 0,
                cacheWrite: 0,
                noCache: 100,
            },
            outputTokens: {
                total: 50,
                text: 50,
                reasoning: 0,
            },
        })
    })

    it('handles undefined usage', () => {
        const requestyUsage: z.infer<typeof RequestyUsageSchema> = undefined

        const result = adaptUsage(requestyUsage)

        expect(result).toStrictEqual({
            inputTokens: {
                total: 0,
                cacheRead: 0,
                cacheWrite: 0,
                noCache: 0,
            },
            outputTokens: {
                total: 0,
                text: 0,
                reasoning: 0,
            },
        })
    })

    it('handles empty object', () => {
        const requestyUsage: z.infer<typeof RequestyUsageSchema> = {}

        const result = adaptUsage(requestyUsage)

        expect(result).toStrictEqual({
            inputTokens: {
                total: 0,
                cacheRead: 0,
                cacheWrite: 0,
                noCache: 0,
            },
            outputTokens: {
                total: 0,
                text: 0,
                reasoning: 0,
            },
        })
    })

    it('handles partial cache details', () => {
        const requestyUsage: z.infer<typeof RequestyUsageSchema> = {
            prompt_tokens: 100,
            completion_tokens: 50,
            prompt_tokens_details: {
                cached_tokens: 20,
            },
        }

        const result = adaptUsage(requestyUsage)

        expect(result).toStrictEqual({
            inputTokens: {
                total: 100,
                cacheRead: 20,
                cacheWrite: 0,
                noCache: 80,
            },
            outputTokens: {
                total: 50,
                text: 50,
                reasoning: 0,
            },
        })
    })

    it('calculates noCache correctly when cached tokens equal prompt tokens', () => {
        const requestyUsage: z.infer<typeof RequestyUsageSchema> = {
            prompt_tokens: 100,
            completion_tokens: 50,
            prompt_tokens_details: {
                cached_tokens: 100,
            },
        }

        const result = adaptUsage(requestyUsage)

        expect(result.inputTokens.noCache).toBe(0)
    })

    it('handles zero values', () => {
        const requestyUsage: z.infer<typeof RequestyUsageSchema> = {
            prompt_tokens: 0,
            completion_tokens: 0,
            prompt_tokens_details: {
                cached_tokens: 0,
                caching_tokens: 0,
            },
        }

        const result = adaptUsage(requestyUsage)

        expect(result).toStrictEqual({
            inputTokens: {
                total: 0,
                cacheRead: 0,
                cacheWrite: 0,
                noCache: 0,
            },
            outputTokens: {
                total: 0,
                text: 0,
                reasoning: 0,
            },
        })
    })

    it('handles large token counts', () => {
        const requestyUsage: z.infer<typeof RequestyUsageSchema> = {
            prompt_tokens: 1000000,
            completion_tokens: 500000,
            prompt_tokens_details: {
                cached_tokens: 200000,
                caching_tokens: 100000,
            },
        }

        const result = adaptUsage(requestyUsage)

        expect(result).toStrictEqual({
            inputTokens: {
                total: 1000000,
                cacheRead: 200000,
                cacheWrite: 100000,
                noCache: 800000,
            },
            outputTokens: {
                total: 500000,
                text: 500000,
                reasoning: 0,
            },
        })
    })
})
