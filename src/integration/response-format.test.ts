import { generateObject, generateText, Output, tool } from 'ai'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { chatCompletion, mockRequesty } from './mock-fetch'

const schema = z.object({ name: z.string() })

const jsonCompletion = () =>
    chatCompletion({
        choices: [
            {
                index: 0,
                message: { role: 'assistant', content: '{"name":"John"}' },
                finish_reason: 'stop',
            },
        ],
    })

describe('response_format', () => {
    it('sends the schema as json_schema', async () => {
        const { requesty, requestBody } = mockRequesty(jsonCompletion)

        const { object } = await generateObject({
            model: requesty.chat('anthropic/claude-fable-5.1'),
            schema,
            schemaName: 'person',
            schemaDescription: 'A person',
            prompt: 'Hello!',
        })

        expect(object).toEqual({ name: 'John' })
        expect(requestBody().response_format).toEqual({
            type: 'json_schema',
            json_schema: {
                name: 'person',
                description: 'A person',
                schema: expect.objectContaining({ type: 'object' }),
            },
        })
    })

    it('sends json_schema when tools are present', async () => {
        const { requesty, requestBody } = mockRequesty(jsonCompletion)

        await generateText({
            model: requesty.chat('anthropic/claude-fable-5.1'),
            output: Output.object({ schema }),
            tools: {
                noop: tool({
                    inputSchema: z.object({}),
                    execute: async () => 'ok',
                }),
            },
            prompt: 'Hello!',
        })

        expect(requestBody().response_format).toEqual({
            type: 'json_schema',
            json_schema: {
                name: 'response',
                schema: expect.objectContaining({ type: 'object' }),
            },
        })
    })

    it('sends json_object without a schema', async () => {
        const { requesty, requestBody } = mockRequesty(jsonCompletion)

        await generateObject({
            model: requesty.chat('anthropic/claude-fable-5.1'),
            output: 'no-schema',
            prompt: 'Hello!',
        })

        expect(requestBody().response_format).toEqual({ type: 'json_object' })
    })

    it('omits response_format for text', async () => {
        const { requesty, requestBody } = mockRequesty(() => chatCompletion())

        await generateText({
            model: requesty.chat('anthropic/claude-fable-5.1'),
            prompt: 'Hello!',
        })

        expect(requestBody().response_format).toBeUndefined()
    })
})
