import { generateText, streamText, tool } from 'ai'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createRequesty } from '..'
import { getTestModels } from './get-models'

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

const modelsToTest = getTestModels()

describe.concurrent.each(modelsToTest)(
    'Tool Calling Tests - $name',
    ({ id }) => {
        const model = requesty.chat(id)

        it('should handle tool calling with generateText', async () => {
            const result = await generateText({
                model,
                prompt: 'What is the weather like in Paris, France? Use celsius.',
                tools: {
                    getWeather: weatherTool,
                },
                maxOutputTokens: 1000,
                temperature: 0.3,
                toolChoice: 'required',
            })

            expect(result.text).toBeDefined()
            expect(result.usage.inputTokens).toBeGreaterThan(0)
            expect(result.usage.outputTokens).toBeGreaterThan(0)
            expect(result.toolCalls.length).toBeGreaterThan(0)

            const toolCall = result.toolCalls[0]
            expect(toolCall?.toolName).toBe('getWeather')
            expect(toolCall?.input).toBeDefined()
        })

        it('should handle tool calling with streamText', async () => {
            const streamResult = streamText({
                model,
                prompt: 'Get the weather for London, then tell me what clothes I should wear.',
                tools: {
                    getWeather: weatherTool,
                },
                maxOutputTokens: 300,
                temperature: 0.4,
                toolChoice: 'required',
            })

            for await (const _delta of streamResult.textStream) {
                // Consume the stream
            }

            const steps = await streamResult.steps

            expect(steps.length).toBeGreaterThan(0)
        })

        it('should handle multi conversation tools', async () => {
            const firstResult = await generateText({
                model,
                prompt: 'What is the weather like in London?',
                tools: {
                    getWeather: weatherTool,
                },
                maxOutputTokens: 2000,
                toolChoice: 'required',
            })

            expect(firstResult.text).toBeDefined()
            expect(firstResult.usage.inputTokens).toBeGreaterThan(0)
            expect(firstResult.usage.outputTokens).toBeGreaterThan(0)
            expect(firstResult.toolCalls.length).toBeGreaterThan(0)

            const firstToolCall = firstResult.toolCalls[0]
            expect(firstToolCall?.toolName).toBe('getWeather')
            expect(firstToolCall?.input).toBeDefined()

            const secondResult = await generateText({
                model,
                messages: firstResult.response.messages,
                tools: {
                    getWeather: weatherTool,
                },
                maxOutputTokens: 2000,
            })

            expect(secondResult.text).toBeDefined()
            expect(secondResult.text).length.greaterThan(0)

            const thirdResult = await generateText({
                model,
                messages: [
                    ...secondResult.response.messages,
                    { role: 'user', content: 'What about Lisbon?' },
                ],
                tools: {
                    getWeather: weatherTool,
                },
                maxOutputTokens: 2000,
                toolChoice: 'required',
            })

            expect(thirdResult.text).toBeDefined()
            expect(thirdResult.toolCalls.length).toBeGreaterThan(0)

            const thirdToolCall = firstResult.toolCalls[0]
            expect(thirdToolCall?.toolName).toBe('getWeather')
            expect(thirdToolCall?.input).toBeDefined()
        })

        it('should handle streaming multi conversation tools', async () => {
            const firstResult = streamText({
                model,
                prompt: 'What is the weather like in London?',
                tools: {
                    getWeather: weatherTool,
                },
                maxOutputTokens: 2000,
                toolChoice: 'required',
            })

            await firstResult.consumeStream()

            await expect(firstResult.text).resolves.toBeDefined()

            const firstResultToolCalls = await firstResult.toolCalls

            expect(firstResultToolCalls.length).toBeGreaterThan(0)

            const firstToolCall = firstResultToolCalls[0]
            expect(firstToolCall?.toolName).toBe('getWeather')
            expect(firstToolCall?.input).toBeDefined()

            const firstResultMessages = (await firstResult.response).messages

            const secondResult = streamText({
                model,
                messages: firstResultMessages,
                tools: {
                    getWeather: weatherTool,
                },
                maxOutputTokens: 2000,
            })

            await secondResult.consumeStream()

            await expect(secondResult.text).resolves.toBeDefined()
        })
    },
)
