import type { LanguageModelV2StreamPart } from '@ai-sdk/provider'
import { describe, expect, it, vi } from 'vitest'
import { createTransform } from './index'

describe('stream', () => {
    describe('createTransform', () => {
        it('handles error chunk with success: false', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(), set: vi.fn() }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const enqueuedParts: LanguageModelV2StreamPart[] = []
            const controller = {
                enqueue: (part: LanguageModelV2StreamPart) => {
                    enqueuedParts.push(part)
                },
            } as any

            transform(
                {
                    success: false,
                    error: new Error('Test error'),
                } as any,
                controller,
            )

            expect(finishReason.set).toHaveBeenCalledWith('error')
            expect(enqueuedParts).toHaveLength(1)
            expect(enqueuedParts[0]).toEqual({
                type: 'error',
                error: 'Test error',
            })
        })

        it('handles error in chunk value', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(), set: vi.fn() }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const enqueuedParts: LanguageModelV2StreamPart[] = []
            const controller = {
                enqueue: (part: LanguageModelV2StreamPart) => {
                    enqueuedParts.push(part)
                },
            } as any

            transform(
                {
                    success: true,
                    value: {
                        error: 'API error occurred',
                    },
                } as any,
                controller,
            )

            expect(finishReason.set).toHaveBeenCalledWith('error')
            expect(enqueuedParts).toHaveLength(1)
            expect(enqueuedParts[0]).toEqual({
                type: 'error',
                error: 'API error occurred',
            })
        })

        it('enqueues response metadata when id is present', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const enqueuedParts: LanguageModelV2StreamPart[] = []
            const controller = {
                enqueue: (part: LanguageModelV2StreamPart) => {
                    enqueuedParts.push(part)
                },
            } as any

            transform(
                {
                    success: true,
                    value: {
                        id: 'chatcmpl-123',
                        choices: [{ delta: {} }],
                    },
                } as any,
                controller,
            )

            expect(enqueuedParts).toContainEqual({
                type: 'response-metadata',
                id: 'chatcmpl-123',
            })
        })

        it('enqueues response metadata when model is present', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const enqueuedParts: LanguageModelV2StreamPart[] = []
            const controller = {
                enqueue: (part: LanguageModelV2StreamPart) => {
                    enqueuedParts.push(part)
                },
            } as any

            transform(
                {
                    success: true,
                    value: {
                        model: 'gpt-4o-mini',
                        choices: [{ delta: {} }],
                    },
                } as any,
                controller,
            )

            expect(enqueuedParts).toContainEqual({
                type: 'response-metadata',
                modelId: 'gpt-4o-mini',
            })
        })

        it('sets usage when usage data is present', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const enqueuedParts: LanguageModelV2StreamPart[] = []
            const controller = {
                enqueue: (part: LanguageModelV2StreamPart) => {
                    enqueuedParts.push(part)
                },
            } as any

            transform(
                {
                    success: true,
                    value: {
                        usage: {
                            prompt_tokens: 10,
                            completion_tokens: 20,
                            total_tokens: 30,
                            prompt_tokens_details: {
                                caching_tokens: 5,
                            },
                        },
                        choices: [{ delta: {} }],
                    },
                } as any,
                controller,
            )

            expect(usage.set).toHaveBeenCalledWith({
                inputTokens: 10,
                outputTokens: 20,
                totalTokens: 30,
            })
            expect(requestyUsage.set).toHaveBeenCalledWith({
                cachingTokens: 5,
            })
        })

        it('handles text content delta with new text stream', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const enqueuedParts: LanguageModelV2StreamPart[] = []
            const controller = {
                enqueue: (part: LanguageModelV2StreamPart) => {
                    enqueuedParts.push(part)
                },
            } as any

            transform(
                {
                    success: true,
                    value: {
                        choices: [
                            {
                                delta: {
                                    content: 'Hello',
                                },
                            },
                        ],
                    },
                } as any,
                controller,
            )

            const id = activeId.set.mock.lastCall?.[0]
            expect(id).toBeDefined()

            expect(enqueuedParts).toContainEqual(
                expect.objectContaining({
                    type: 'text-start',
                    id,
                }),
            )
            expect(enqueuedParts).toContainEqual(
                expect.objectContaining({
                    type: 'text-delta',
                    delta: 'Hello',
                }),
            )
        })

        it('handles text content delta with existing text stream', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const existingId = 'existing-text-id'
            const activeId = {
                get: vi.fn(() => existingId),
                set: vi.fn(),
            }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const enqueuedParts: LanguageModelV2StreamPart[] = []
            const controller = {
                enqueue: (part: LanguageModelV2StreamPart) => {
                    enqueuedParts.push(part)
                },
            } as any

            transform(
                {
                    success: true,
                    value: {
                        choices: [
                            {
                                delta: {
                                    content: ' world',
                                },
                            },
                        ],
                    },
                } as any,
                controller,
            )

            expect(activeId.set).not.toHaveBeenCalled()
            expect(enqueuedParts).not.toContainEqual(
                expect.objectContaining({
                    type: 'text-start',
                }),
            )
            expect(enqueuedParts).toContainEqual({
                type: 'text-delta',
                id: existingId,
                delta: ' world',
            })
        })

        it('handles reasoning delta with new reasoning stream', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
            const reasoningId = { get: vi.fn(() => undefined), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const enqueuedParts: LanguageModelV2StreamPart[] = []
            const controller = {
                enqueue: (part: LanguageModelV2StreamPart) => {
                    enqueuedParts.push(part)
                },
            } as any

            transform(
                {
                    success: true,
                    value: {
                        choices: [
                            {
                                delta: {
                                    reasoning: 'Let me think...',
                                },
                            },
                        ],
                    },
                } as any,
                controller,
            )

            expect(activeId.set).toHaveBeenCalled()
            expect(enqueuedParts).toContainEqual(
                expect.objectContaining({
                    type: 'reasoning-start',
                }),
            )
            expect(enqueuedParts).toContainEqual(
                expect.objectContaining({
                    type: 'reasoning-delta',
                    delta: 'Let me think...',
                }),
            )
        })

        it('handles reasoning delta with existing reasoning stream', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
            const existingReasoningId = 'existing-reasoning-id'
            const reasoningId = {
                get: vi.fn(() => existingReasoningId),
                set: vi.fn(),
            }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const enqueuedParts: LanguageModelV2StreamPart[] = []
            const controller = {
                enqueue: (part: LanguageModelV2StreamPart) => {
                    enqueuedParts.push(part)
                },
            } as any

            transform(
                {
                    success: true,
                    value: {
                        choices: [
                            {
                                delta: {
                                    reasoning: ' more reasoning',
                                },
                            },
                        ],
                    },
                } as any,
                controller,
            )

            expect(activeId.set).not.toHaveBeenCalled()
            expect(enqueuedParts).not.toContainEqual(
                expect.objectContaining({
                    type: 'reasoning-start',
                }),
            )
            expect(enqueuedParts).toContainEqual({
                type: 'reasoning-delta',
                id: existingReasoningId,
                delta: ' more reasoning',
            })
        })

        it('handles usage with default values when fields are missing', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const controller = {
                enqueue: vi.fn(),
            } as any

            transform(
                {
                    success: true,
                    value: {
                        usage: {},
                        choices: [{ delta: {} }],
                    },
                } as any,
                controller,
            )

            expect(usage.set).toHaveBeenCalledWith({
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
            })
            expect(requestyUsage.set).toHaveBeenCalledWith({
                cachingTokens: 0,
            })
        })
    })

    describe('tool calls', () => {
        it.for([['invalid'], ['function'], [undefined], [null]])(
            'works with tool call type: %s',
            (a) => {
                const finishReason = { get: vi.fn(), set: vi.fn() }
                const usage = { get: vi.fn(), set: vi.fn() }
                const requestyUsage = { get: vi.fn(), set: vi.fn() }
                const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
                const reasoningId = { get: vi.fn(), set: vi.fn() }
                const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

                const transform = createTransform({
                    finishReason,
                    usage,
                    requestyUsage,
                    activeId,
                    reasoningId,
                    existingToolCalls,
                })

                const controller = {
                    enqueue: vi.fn(),
                } as any

                expect(() =>
                    transform(
                        {
                            success: true,
                            value: {
                                choices: [
                                    {
                                        delta: {
                                            tool_calls: [
                                                {
                                                    index: 0,
                                                    id: 'call_123',
                                                    type: a,
                                                    function: {
                                                        name: 'get_weather',
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        } as any,
                        controller,
                    ),
                ).not.toThrow()
            },
        )

        it('validates tool call has id', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const controller = {
                enqueue: vi.fn(),
            } as any

            expect(() =>
                transform(
                    {
                        success: true,
                        value: {
                            choices: [
                                {
                                    delta: {
                                        tool_calls: [
                                            {
                                                index: 0,
                                                id: null,
                                                type: 'function',
                                                function: {
                                                    name: 'get_weather',
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    } as any,
                    controller,
                ),
            ).toThrow('new tool should have an id')
        })

        it('validates tool call has function name', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const controller = {
                enqueue: vi.fn(),
            } as any

            expect(() =>
                transform(
                    {
                        success: true,
                        value: {
                            choices: [
                                {
                                    delta: {
                                        tool_calls: [
                                            {
                                                index: 0,
                                                id: 'call_123',
                                                type: 'function',
                                                function: {
                                                    name: null,
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    } as any,
                    controller,
                ),
            ).toThrow('new tool call should have a defined name')
        })

        it('handles complete tool call in single chunk', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const enqueuedParts: LanguageModelV2StreamPart[] = []
            const controller = {
                enqueue: (part: LanguageModelV2StreamPart) => {
                    enqueuedParts.push(part)
                },
            } as any

            transform(
                {
                    success: true,
                    value: {
                        choices: [
                            {
                                delta: {
                                    tool_calls: [
                                        {
                                            index: 0,
                                            id: 'call_123',
                                            type: 'function',
                                            function: {
                                                name: 'get_weather',
                                                arguments: '{"location":"NYC"}',
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                } as any,
                controller,
            )

            expect(enqueuedParts).toStrictEqual([
                {
                    id: 'call_123',
                    toolName: 'get_weather',
                    type: 'tool-input-start',
                },
                {
                    delta: '{"location":"NYC"}',
                    id: 'call_123',
                    type: 'tool-input-delta',
                },
                {
                    id: 'call_123',
                    type: 'tool-input-end',
                },
                {
                    input: '{"location":"NYC"}',
                    toolCallId: 'call_123',
                    toolName: 'get_weather',
                    type: 'tool-call',
                },
            ])
        })

        it('handles partial tool arguments across multiple chunks', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            let toolCalls: any[] = []
            const existingToolCalls = {
                get: vi.fn(() => toolCalls),
                set: vi.fn((newCalls) => {
                    toolCalls = newCalls
                }),
            }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const enqueuedParts: LanguageModelV2StreamPart[] = []
            const controller = {
                enqueue: (part: LanguageModelV2StreamPart) => {
                    enqueuedParts.push(part)
                },
            } as any

            transform(
                {
                    success: true,
                    value: {
                        choices: [
                            {
                                delta: {
                                    tool_calls: [
                                        {
                                            index: 0,
                                            id: 'call_123',
                                            type: 'function',
                                            function: {
                                                name: 'get_weather',
                                                arguments: '{"loc',
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                } as any,
                controller,
            )

            const firstCallCount = enqueuedParts.filter(
                (p) => p.type === 'tool-call',
            ).length
            expect(firstCallCount).toBe(0)

            transform(
                {
                    success: true,
                    value: {
                        choices: [
                            {
                                delta: {
                                    tool_calls: [
                                        {
                                            index: 0,
                                            function: {
                                                arguments: 'ation":"NYC"}',
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                } as any,
                controller,
            )

            expect(enqueuedParts).toContainEqual({
                type: 'tool-input-delta',
                id: 'call_123',
                delta: 'ation":"NYC"}',
            })
            expect(enqueuedParts).toContainEqual({
                type: 'tool-call',
                toolCallId: 'call_123',
                toolName: 'get_weather',
                input: '{"location":"NYC"}',
            })
        })

        it('handles multiple concurrent tool calls', () => {
            const finishReason = { get: vi.fn(), set: vi.fn() }
            const usage = { get: vi.fn(), set: vi.fn() }
            const requestyUsage = { get: vi.fn(), set: vi.fn() }
            const activeId = { get: vi.fn(() => undefined), set: vi.fn() }
            const reasoningId = { get: vi.fn(), set: vi.fn() }
            const existingToolCalls = { get: vi.fn(() => []), set: vi.fn() }

            const transform = createTransform({
                finishReason,
                usage,
                requestyUsage,
                activeId,
                reasoningId,
                existingToolCalls,
            })

            const enqueuedParts: LanguageModelV2StreamPart[] = []
            const controller = {
                enqueue: (part: LanguageModelV2StreamPart) => {
                    enqueuedParts.push(part)
                },
            } as any

            transform(
                {
                    success: true,
                    value: {
                        choices: [
                            {
                                delta: {
                                    tool_calls: [
                                        {
                                            index: 0,
                                            id: 'call_123',
                                            type: 'function',
                                            function: {
                                                name: 'get_weather',
                                                arguments: '{"location":"NYC"}',
                                            },
                                        },
                                        {
                                            index: 1,
                                            id: 'call_456',
                                            type: 'function',
                                            function: {
                                                name: 'get_time',
                                                arguments: '{"timezone":"PST"}',
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                } as any,
                controller,
            )

            const toolCalls = enqueuedParts.filter(
                (p) => p.type === 'tool-call',
            )
            expect(toolCalls).toHaveLength(2)
            expect(toolCalls[0]).toMatchObject({
                toolCallId: 'call_123',
                toolName: 'get_weather',
            })
            expect(toolCalls[1]).toMatchObject({
                toolCallId: 'call_456',
                toolName: 'get_time',
            })
        })
    })
})
