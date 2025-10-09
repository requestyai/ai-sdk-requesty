import { generateText, streamText, tool } from 'ai'
import { config } from 'dotenv'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createRequesty } from '..'

config({ path: resolve(__dirname, '.env') })

const requesty = createRequesty({
    apiKey: process.env.REQUESTY_API_KEY,
    baseURL: process.env.REQUESTY_BASE_URL,
})

const weatherTool = tool({
    description: 'Get weather information for a location',
    inputSchema: z.object({
        location: z.string().describe('The city and country'),
        unit: z.enum(['celsius', 'fahrenheit']).describe('Temperature unit'),
    }),
    execute: async ({ location, unit }: { location: string; unit: string }) => {
        return `The weather in ${location} is 22°${unit === 'celsius' ? 'C' : 'F'} and sunny.`
    },
})

describe('Requesty Real Integration Tests', () => {
    const model = requesty.chat('openai/gpt-4o')

    it('should handle basic generateText (non-streaming)', async () => {
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

    it('should handle streaming text generation', async () => {
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

        const finalUsage = await streamResult.usage
        const finalFinishReason = await streamResult.finishReason

        expect(finalUsage.inputTokens).toBeGreaterThan(0)
        expect(finalUsage.outputTokens).toBeGreaterThan(0)
        expect(finalUsage.totalTokens).toBeGreaterThan(0)
        expect(finalFinishReason).toBeDefined()
    })

    it('should handle tool calling (function calling)', async () => {
        const toolResult = await generateText({
            model,
            prompt: 'What is the weather like in Paris, France? Use celsius.',
            tools: {
                getWeather: weatherTool,
            },
            maxOutputTokens: 200,
            temperature: 0.3,
        })

        expect(toolResult.text).toBeDefined()
        expect(toolResult.usage.inputTokens).toBeGreaterThan(0)
        expect(toolResult.usage.outputTokens).toBeGreaterThan(0)
        expect(toolResult.toolCalls.length).toBeGreaterThan(0)

        const toolCall = toolResult.toolCalls[0]
        expect(toolCall.toolName).toBe('getWeather')
        expect(toolCall.args).toBeDefined()
        expect(toolCall.result).toBeDefined()
    })

    it('should handle streaming with tool calling', async () => {
        const streamWithToolsResult = streamText({
            model,
            prompt: 'Get the weather for London, then tell me what clothes I should wear.',
            tools: {
                getWeather: weatherTool,
            },
            maxOutputTokens: 300,
            temperature: 0.4,
        })

        let streamingToolText = ''
        for await (const delta of streamWithToolsResult.textStream) {
            streamingToolText += delta
        }

        const finalStreamUsage = await streamWithToolsResult.usage
        const finalStreamFinishReason = await streamWithToolsResult.finishReason
        const finalStreamToolCalls = await streamWithToolsResult.toolCalls

        expect(finalStreamUsage.inputTokens).toBeGreaterThan(0)
        expect(finalStreamUsage.outputTokens).toBeGreaterThan(0)
        expect(finalStreamFinishReason).toBeDefined()
        expect(finalStreamToolCalls.length).toBeGreaterThan(0)
    })

    it('should handle provider-specific options (Requesty metadata)', async () => {
        const metadataResult = await generateText({
            model,
            prompt: 'Explain artificial intelligence in one sentence.',
            maxOutputTokens: 100,
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

        expect(metadataResult.text).toBeDefined()
        expect(metadataResult.text.length).toBeGreaterThan(0)
        expect(metadataResult.usage.inputTokens).toBeGreaterThan(0)
        expect(metadataResult.usage.outputTokens).toBeGreaterThan(0)
    })

    it('should handle multi-modal messages (text + image)', async () => {
        const multiModalResult = await generateText({
            model,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Describe this simple image:' },
                        {
                            type: 'image',
                            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                        },
                    ],
                },
            ],
            maxOutputTokens: 100,
        })

        expect(multiModalResult.text).toBeDefined()
        expect(multiModalResult.text.length).toBeGreaterThan(0)
        expect(multiModalResult.usage.inputTokens).toBeGreaterThan(0)
        expect(multiModalResult.usage.outputTokens).toBeGreaterThan(0)
    })

    it('should handle AI SDK v5 message format with system messages', async () => {
        const messagesResult = await generateText({
            model,
            system: 'You are a helpful assistant that responds concisely.',
            messages: [
                { role: 'user', content: 'What is the capital of France?' },
                {
                    role: 'assistant',
                    content: 'The capital of France is Paris.',
                },
                { role: 'user', content: 'What about Germany?' },
            ],
            maxOutputTokens: 50,
        })

        expect(messagesResult.text).toBeDefined()
        expect(messagesResult.text.length).toBeGreaterThan(0)
        expect(messagesResult.usage.inputTokens).toBeGreaterThan(0)
        expect(messagesResult.usage.outputTokens).toBeGreaterThan(0)
    })
})
