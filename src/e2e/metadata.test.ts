import { generateText } from 'ai'
import { describe, expect, it } from 'vitest'
import { createRequesty } from '..'
import { getTestModels } from './get-models'

const requesty = createRequesty({
    apiKey: process.env.REQUESTY_API_KEY,
    baseURL: process.env.REQUESTY_BASE_URL,
})

const modelsToTest = getTestModels()

describe.concurrent.each(modelsToTest)(
    'Provider Options & Multi-Modal Tests - $name',
    ({ id }) => {
        const model = requesty.chat(id)

        it('should handle provider-specific options (Requesty metadata)', async () => {
            const result = await generateText({
                model,
                prompt: 'Explain artificial intelligence in one very small sentence.',
                maxOutputTokens: 2000,
                providerOptions: {
                    requesty: {
                        tags: ['ai-sdk-test', 'explanation'],
                        user_id: 'test_user_123',
                        trace_id: 'integration_test_456',
                        extra: {
                            country: 'us',
                            prompt_title: 'AI explanation test',
                            content_type: 'educational',
                            test_environment: 'development',
                        },
                    },
                },
            })

            expect(result.text).toBeDefined()
            expect(result.text.length).toBeGreaterThan(0)
            expect(result.usage.inputTokens).toBeGreaterThan(0)
            expect(result.usage.outputTokens).toBeGreaterThan(0)
        })

        it('should handle multi-modal messages (text + image)', async () => {
            const result = await generateText({
                model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Describe this simple image in 10 words.',
                            },
                            {
                                type: 'image',
                                image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                            },
                        ],
                    },
                ],
                maxOutputTokens: 2000,
            })

            expect(result.text).toBeDefined()
            expect(result.text.length).toBeGreaterThan(0)
            expect(result.usage.inputTokens).toBeGreaterThan(0)
            expect(result.usage.outputTokens).toBeGreaterThan(0)
        })
    },
)
