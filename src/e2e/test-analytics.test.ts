import { generateText } from 'ai'
import { config } from 'dotenv'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { createRequesty } from '..'

config({ path: resolve(__dirname, '.env') })

const requesty = createRequesty({
    apiKey: process.env.REQUESTY_API_KEY,
    baseURL: process.env.REQUESTY_BASE_URL,
})

describe('Analytics E2E Tests', () => {
    it('should collect analytics metadata when enabled', async () => {
        const model = requesty.chat('openai/gpt-4o-mini')

        const { text } = await generateText({
            model,
            prompt: 'Say hello in one sentence',
            maxOutputTokens: 50,
            providerOptions: {
                requesty: {
                    analytics: true,
                    tags: ['test', 'analytics'],
                    user_id: 'test-user-123',
                    extra: {
                        test_type: 'analytics-test',
                        custom_field: 'user-value',
                    },
                },
            },
        })

        expect(text).toBeDefined()
        expect(text.length).toBeGreaterThan(0)
        expect(typeof text).toBe('string')
    })

    it('should work without analytics enabled', async () => {
        const model = requesty.chat('openai/gpt-4o-mini')

        const { text } = await generateText({
            model,
            prompt: 'Say hello in one sentence',
            maxOutputTokens: 50,
            providerOptions: {
                requesty: {
                    tags: ['test'],
                    user_id: 'test-user-456',
                },
            },
        })

        expect(text).toBeDefined()
        expect(text.length).toBeGreaterThan(0)
    })

    it('should merge analytics with user extra data', async () => {
        const model = requesty.chat('openai/gpt-4o-mini')

        const { text } = await generateText({
            model,
            prompt: 'Count to 3',
            maxOutputTokens: 20,
            providerOptions: {
                requesty: {
                    analytics: true,
                    extra: {
                        priority: 'high',
                        department: 'engineering',
                    },
                },
            },
        })

        expect(text).toBeDefined()
        expect(typeof text).toBe('string')
    })
})
