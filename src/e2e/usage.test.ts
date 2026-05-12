import { generateText, streamText } from 'ai'
import { describe, expect, it } from 'vitest'
import { createRequesty } from '..'
import { getTestModels } from './get-models'

const requesty = createRequesty({
    apiKey: process.env.REQUESTY_API_KEY,
    baseURL: process.env.REQUESTY_BASE_URL,
})

const modelsToTest = getTestModels()

describe.concurrent.each(modelsToTest)('Usage and Cost', ({ id }) => {
    const model = requesty.chat(id)

    describe.skip('generateText', () => {
        it('should return cost in response', async () => {
            const result = await generateText({
                model,
                prompt: 'Say hello in one word.',
                maxOutputTokens: 100,
                temperature: 0.3,
            })

            const raw = result.usage.raw
            expect(raw).toBeDefined()
            expect(raw!.cost).toBeTypeOf('number')
        })
    })

    describe('streamText', () => {
        it('should return cost in response', async () => {
            const result = streamText({
                model,
                prompt: 'Say hello in one word.',
                maxOutputTokens: 100,
                temperature: 0.3,
            })

            const raw = (await result.usage).raw
            expect(raw).toBeDefined()
            expect(raw!.cost).toBeTypeOf('number')
        })
    })
})
