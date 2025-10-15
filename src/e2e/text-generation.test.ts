import { generateText, streamText } from 'ai'
import { describe, expect, it } from 'vitest'
import { createRequesty } from '..'
import { getTestModels } from './get-models'

const requesty = createRequesty({
    apiKey: process.env.REQUESTY_API_KEY,
    baseURL: process.env.REQUESTY_BASE_URL,
})

const modelsToTest = getTestModels()

describe.concurrent.each(modelsToTest)(
    'Text Generation Tests - $name',
    ({ id }) => {
        const model = requesty.chat(id)

        describe('generateText', () => {
            it('should generate text with basic prompt', async () => {
                const result = await generateText({
                    model,
                    prompt: 'Hello! Introduce yourself briefly.',
                    maxOutputTokens: 50,
                    temperature: 0.3,
                })

                expect(result.text).toBeDefined()
                expect(result.text.length).toBeGreaterThan(0)
                expect(result.usage.inputTokens).toBeGreaterThan(0)
                expect(result.usage.outputTokens).toBeGreaterThan(0)
                expect(result.usage.totalTokens).toBeGreaterThan(0)
                expect(result.finishReason).toBeDefined()
            })

            it('should handle messages array with system message', async () => {
                const result = await generateText({
                    model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful AI assistant.',
                        },
                        {
                            role: 'user',
                            content: 'Write a short haiku about clouds.',
                        },
                    ],
                })

                expect(result.text).toBeDefined()
                expect(result.text.length).toBeGreaterThan(0)
                expect(typeof result.text).toBe('string')
            })

            it('should handle multi-turn conversation', async () => {
                const result = await generateText({
                    model,
                    system: 'You are a helpful assistant that responds concisely.',
                    messages: [
                        {
                            role: 'user',
                            content: 'What is the capital of France?',
                        },
                        {
                            role: 'assistant',
                            content: 'The capital of France is Paris.',
                        },
                        { role: 'user', content: 'What about Germany?' },
                    ],
                    maxOutputTokens: 50,
                })

                expect(result.text).toBeDefined()
                expect(result.text.length).toBeGreaterThan(0)
                expect(result.usage.inputTokens).toBeGreaterThan(0)
                expect(result.usage.outputTokens).toBeGreaterThan(0)
            })
        })

        describe('streamText', () => {
            it('should stream text generation', async () => {
                const streamResult = streamText({
                    model,
                    prompt: 'Explain the numbers 1 through 5 briefly.',
                    maxOutputTokens: 300,
                    temperature: 0.5,
                })

                let fullText = ''
                for await (const delta of streamResult.textStream) {
                    fullText += delta
                }

                expect(fullText.length).toBeGreaterThan(0)

                const finalFinishReason = await streamResult.finishReason
                expect(finalFinishReason).toBeDefined()
            })
        })
    },
)

describe('Model-Specific Features', () => {
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

    it('should handle reasoning with budget via providerOptions', async () => {
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
