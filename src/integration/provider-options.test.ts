import { generateText } from 'ai'
import { describe, expect, it } from 'vitest'
import { BASE_URL, chatCompletion, mockRequesty } from './mock-fetch'

describe('providerOptions.requesty', () => {
    it('overrides model settings', async () => {
        const { requesty, requestUrl, requestBody } = mockRequesty(() =>
            chatCompletion(),
        )

        await generateText({
            model: requesty.chat('openai/gpt-4o-mini', {
                includeReasoning: false,
                reasoningEffort: 'low',
                user: 'settings-user',
                extraBody: { foo: 'settings', keep: 'settings' },
            }),
            prompt: 'Hello!',
            providerOptions: {
                requesty: {
                    includeReasoning: true,
                    reasoningEffort: 'max',
                    user: 'call-user',
                    extraBody: { foo: 'options' },
                },
            },
        })

        expect(requestUrl()).toBe(`${BASE_URL}/chat/completions`)

        const body = requestBody()
        expect(body.include_reasoning).toBe(true)
        expect(body.reasoning_effort).toBe('max')
        expect(body.user).toBe('call-user')
        expect(body.foo).toBe('options')
        expect(body.keep).toBe('settings')

        // known options are mapped, never sent verbatim:
        expect(body.extraBody).toBeUndefined()
        expect(body.requesty).toBeUndefined()
    })

    it('falls back to model settings when not provided', async () => {
        const { requesty, requestBody } = mockRequesty(() => chatCompletion())

        await generateText({
            model: requesty.chat('openai/gpt-4o-mini', {
                includeReasoning: true,
                reasoningEffort: 'medium',
                user: 'settings-user',
            }),
            prompt: 'Hello!',
        })

        const body = requestBody()
        expect(body.include_reasoning).toBe(true)
        expect(body.reasoning_effort).toBe('medium')
        expect(body.user).toBe('settings-user')
    })

    it('nests unknown options under the `requesty` field', async () => {
        const { requesty, requestBody } = mockRequesty(() => chatCompletion())

        await generateText({
            model: requesty.chat('openai/gpt-4o-mini'),
            prompt: 'Hello!',
            providerOptions: {
                requesty: {
                    includeReasoning: true,
                    tags: ['ai-sdk-test'],
                    trace_id: 'trace-123',
                },
            },
        })

        const body = requestBody()
        expect(body.requesty).toEqual({
            tags: ['ai-sdk-test'],
            trace_id: 'trace-123',
        })
        expect(body.include_reasoning).toBe(true)
    })
})
