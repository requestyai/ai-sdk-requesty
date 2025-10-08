import { describe, expect, it } from 'vitest'
import { handleToolCompletion } from './handle-tool-completion'

describe('handleToolCompletion', () => {
    it('handles text output', () => {
        const result = handleToolCompletion({
            role: 'tool',
            content: [
                {
                    type: 'tool-result',
                    toolCallId: 'call_123',
                    toolName: 'get_weather',
                    output: {
                        type: 'text',
                        value: 'The weather is sunny and 72°F.',
                    },
                },
            ],
        })

        expect(result).toBe('The weather is sunny and 72°F.')
    })

    it('handles json output', () => {
        const result = handleToolCompletion({
            role: 'tool',
            content: [
                {
                    type: 'tool-result',
                    toolCallId: 'call_456',
                    toolName: 'get_data',
                    output: {
                        type: 'json',
                        value: { temperature: 72, humidity: 65 },
                    },
                },
            ],
        })

        expect(result).toBe('{"temperature":72,"humidity":65}')
    })

    it('handles error-text output', () => {
        const result = handleToolCompletion({
            role: 'tool',
            content: [
                {
                    type: 'tool-result',
                    toolCallId: 'call_789',
                    toolName: 'failing_tool',
                    output: {
                        type: 'error-text',
                        value: 'Connection timeout',
                    },
                },
            ],
        })

        expect(result).toBe('Error: Connection timeout')
    })

    it('handles error-json output', () => {
        const result = handleToolCompletion({
            role: 'tool',
            content: [
                {
                    type: 'tool-result',
                    toolCallId: 'call_999',
                    toolName: 'api_call',
                    output: {
                        type: 'error-json',
                        value: { error: 'Not found', code: 404 },
                    },
                },
            ],
        })

        expect(result).toBe('Error: {"error":"Not found","code":404}')
    })

    it('handles content output with single text', () => {
        const result = handleToolCompletion({
            role: 'tool',
            content: [
                {
                    type: 'tool-result',
                    toolCallId: 'call_111',
                    toolName: 'process',
                    output: {
                        type: 'content',
                        value: [
                            {
                                type: 'text',
                                text: 'Result here',
                            },
                        ],
                    },
                },
            ],
        })

        expect(result).toBe('Result here')
    })

    it('handles content output with multiple text parts', () => {
        const result = handleToolCompletion({
            role: 'tool',
            content: [
                {
                    type: 'tool-result',
                    toolCallId: 'call_222',
                    toolName: 'analyze',
                    output: {
                        type: 'content',
                        value: [
                            {
                                type: 'text',
                                text: 'Part 1',
                            },
                            {
                                type: 'text',
                                text: 'Part 2',
                            },
                        ],
                    },
                },
            ],
        })

        expect(result).toBe('Part 1\nPart 2')
    })

    it('handles content output with media', () => {
        const result = handleToolCompletion({
            role: 'tool',
            content: [
                {
                    type: 'tool-result',
                    toolCallId: 'call_333',
                    toolName: 'generate',
                    output: {
                        type: 'content',
                        value: [
                            {
                                type: 'text',
                                text: 'Text part',
                            },
                            {
                                type: 'media',
                                mediaType: 'image/png',
                                data: new Uint8Array([1, 2, 3]),
                            } as any,
                        ],
                    },
                },
            ],
        })

        expect(result).toBe('Text part\n[Media: image/png]')
    })

    it('handles content output with only media', () => {
        const result = handleToolCompletion({
            role: 'tool',
            content: [
                {
                    type: 'tool-result',
                    toolCallId: 'call_444',
                    toolName: 'image_gen',
                    output: {
                        type: 'content',
                        value: [
                            {
                                type: 'media',
                                mediaType: 'image/jpeg',
                                data: new Uint8Array([255, 216, 255]),
                            },
                        ],
                    },
                },
            ],
        })

        expect(result).toBe('[Media: image/jpeg]')
    })

    it('handles multiple tool results', () => {
        const result = handleToolCompletion({
            role: 'tool',
            content: [
                {
                    type: 'tool-result',
                    toolCallId: 'call_111',
                    toolName: 'tool_a',
                    output: {
                        type: 'text',
                        value: 'Result A',
                    },
                },
                {
                    type: 'tool-result',
                    toolCallId: 'call_222',
                    toolName: 'tool_b',
                    output: {
                        type: 'text',
                        value: 'Result B',
                    },
                },
            ],
        })

        expect(result).toBe('Result AResult B')
    })

    it('handles empty content', () => {
        const result = handleToolCompletion({
            role: 'tool',
            content: [],
        })

        expect(result).toBe('')
    })

    it('handles content with empty array', () => {
        const result = handleToolCompletion({
            role: 'tool',
            content: [
                {
                    type: 'tool-result',
                    toolCallId: 'call_555',
                    toolName: 'empty',
                    output: {
                        type: 'content',
                        value: [],
                    },
                },
            ],
        })

        expect(result).toBe('')
    })
})
