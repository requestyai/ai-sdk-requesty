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

describe('Requesty E2E Tests', () => {
    it('should handle basic chat', async () => {
        const model = requesty.chat('openai/gpt-4o-mini')

        const { text } = await generateText({
            model,
            messages: [
                { role: 'system', content: 'You are a helpful AI assistant.' },
                { role: 'user', content: 'Write a short haiku about clouds.' },
            ],
        })

        expect(text).toBeDefined()
        expect(text.length).toBeGreaterThan(0)
        expect(typeof text).toBe('string')
    })

    it('should handle reasoning with OpenAI o3-mini', async () => {
        const model = requesty.chat('openai/o3-mini', {
            reasoningEffort: 'medium',
        })

        const { text, usage } = await generateText({
            model,
            messages: [
                {
                    role: 'user',
                    content:
                        'Write a bash script that takes a matrix represented as a string with format "[1,2],[3,4],[5,6]" and prints the transpose in the same format.',
                },
            ],
        })

        expect(text).toBeDefined()
        expect(text.length).toBeGreaterThan(0)
        expect(usage).toBeDefined()
        expect(usage.inputTokens).toBeGreaterThan(0)
        expect(usage.outputTokens).toBeGreaterThan(0)
        expect(usage.totalTokens).toBeGreaterThan(0)
    })

    it('should handle reasoning with budget string via providerOptions', async () => {
        const model = requesty.chat('openai/o3-mini')

        const { text } = await generateText({
            model,
            messages: [
                {
                    role: 'user',
                    content:
                        'Explain step by step how to solve 2x + 5 = 15 for x.',
                },
            ],
            providerOptions: {
                requesty: {
                    reasoning_effort: 'low',
                },
            },
        })

        expect(text).toBeDefined()
        expect(text.length).toBeGreaterThan(0)
        expect(typeof text).toBe('string')
    })
})
