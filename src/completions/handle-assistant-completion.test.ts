import { describe, expect, it } from 'vitest'
import { handleAssistantCompletion } from './handle-assistant-completion'

describe('handleAssistantCompletion', () => {
    it('converts simple text assistant message', () => {
        const result = handleAssistantCompletion(
            {
                role: 'assistant',
                content: [
                    {
                        type: 'text',
                        text: 'I am doing well, thank you!',
                    },
                ],
            },
            '',
        )

        expect(result).toBe('I am doing well, thank you!')
    })

    it('converts assistant message with stop sequence', () => {
        const result = handleAssistantCompletion(
            {
                role: 'assistant',
                content: [
                    {
                        type: 'text',
                        text: 'Hello',
                    },
                ],
            },
            '</s>',
        )

        expect(result).toBe('Hello</s>')
    })

    it('joins multiple text parts', () => {
        const result = handleAssistantCompletion(
            {
                role: 'assistant',
                content: [
                    {
                        type: 'text',
                        text: 'Hello ',
                    },
                    {
                        type: 'text',
                        text: 'world!',
                    },
                ],
            },
            '',
        )

        expect(result).toBe('Hello world!')
    })

    it('handles reasoning content', () => {
        const result = handleAssistantCompletion(
            {
                role: 'assistant',
                content: [
                    {
                        type: 'reasoning',
                        text: 'Let me think about this...',
                    },
                    {
                        type: 'text',
                        text: 'The answer is 42.',
                    },
                ],
            },
            '',
        )

        expect(result).toBe('Let me think about this...The answer is 42.')
    })

    it('handles tool-call content', () => {
        const result = handleAssistantCompletion(
            {
                role: 'assistant',
                content: [
                    {
                        type: 'tool-call',
                        toolCallId: 'call_123',
                        toolName: 'get_weather',
                        input: { location: 'San Francisco' },
                    },
                ],
            },
            '',
        )

        expect(result).toBe(
            'Function call: get_weather({"location":"San Francisco"})',
        )
    })

    it('handles file content', () => {
        const result = handleAssistantCompletion(
            {
                role: 'assistant',
                content: [
                    {
                        type: 'text',
                        text: 'Here is a file: ',
                    },
                    {
                        type: 'file',
                        data: new Uint8Array([1, 2, 3]),
                        mediaType: 'application/pdf',
                    },
                ],
            },
            '',
        )

        expect(result).toBe('Here is a file: [File]')
    })

    it('handles tool-result content', () => {
        const result = handleAssistantCompletion(
            {
                role: 'assistant',
                content: [
                    {
                        type: 'tool-result',
                        toolCallId: 'call_123',
                        toolName: 'get_weather',
                        output: {
                            type: 'json',
                            value: { temperature: 72, condition: 'sunny' },
                        },
                    } as any,
                ],
            },
            '',
        )

        expect(result).toBe(
            'Function result: {"type":"json","value":{"temperature":72,"condition":"sunny"}}',
        )
    })

    it('handles mixed content types', () => {
        const result = handleAssistantCompletion(
            {
                role: 'assistant',
                content: [
                    {
                        type: 'reasoning',
                        text: 'I need to check the weather.',
                    },
                    {
                        type: 'text',
                        text: 'Let me look that up. ',
                    },
                    {
                        type: 'tool-call',
                        toolCallId: 'call_123',
                        toolName: 'get_weather',
                        input: { location: 'NYC' },
                    },
                ],
            },
            '</s>',
        )

        expect(result).toBe(
            'I need to check the weather.Let me look that up. Function call: get_weather({"location":"NYC"})</s>',
        )
    })

    it('handles empty content', () => {
        const result = handleAssistantCompletion(
            {
                role: 'assistant',
                content: [],
            },
            '</s>',
        )

        expect(result).toBe('</s>')
    })
})
