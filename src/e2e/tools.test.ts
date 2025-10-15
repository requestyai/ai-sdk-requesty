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
                maxOutputTokens: 200,
                temperature: 0.3,
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
            })

            for await (const _delta of streamResult.textStream) {
                // Consume the stream
            }

            const steps = await streamResult.steps

            expect(steps.length).toBeGreaterThan(0)
        })
    },
)
