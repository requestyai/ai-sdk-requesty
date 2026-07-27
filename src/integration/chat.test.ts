import { generateText, streamText, tool } from 'ai'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
    chatCompletion,
    chatCompletionStream,
    mockRequesty,
    streamChunk,
} from './mock-fetch'

describe('Requesty Integration - Chat', () => {
    describe('generateText', () => {
        it('should handle basic chat completion', async () => {
            const { requesty } = mockRequesty(() =>
                chatCompletion({
                    choices: [
                        {
                            index: 0,
                            message: {
                                role: 'assistant',
                                content: 'Hello! How can I help you today?',
                            },
                            finish_reason: 'stop',
                        },
                    ],
                    usage: {
                        prompt_tokens: 10,
                        completion_tokens: 9,
                        total_tokens: 19,
                    },
                }),
            )

            const result = await generateText({
                model: requesty.chat('openai/gpt-4o-mini'),
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Hello!' },
                ],
            })

            expect(result.text).toBe('Hello! How can I help you today?')
            expect(result.finishReason).toBe('stop')
            expect(result.usage.inputTokens).toBe(10)
            expect(result.usage.outputTokens).toBe(9)
            expect(result.usage.totalTokens).toBe(19)
        })

        it('should handle tool calls', async () => {
            const { requesty } = mockRequesty(() =>
                chatCompletion({
                    choices: [
                        {
                            index: 0,
                            message: {
                                role: 'assistant',
                                content: null,
                                tool_calls: [
                                    {
                                        id: 'call_abc123',
                                        type: 'function',
                                        function: {
                                            name: 'get_weather',
                                            arguments:
                                                '{"location":"San Francisco"}',
                                        },
                                    },
                                ],
                            },
                            finish_reason: 'tool_calls',
                        },
                    ],
                }),
            )

            const result = await generateText({
                model: requesty.chat('openai/gpt-4o-mini'),
                messages: [
                    {
                        role: 'user',
                        content: 'What is the weather in San Francisco?',
                    },
                ],
                tools: {
                    get_weather: tool({
                        description: 'Get the weather for a location',
                        inputSchema: z.object({
                            location: z.string().describe('The city name'),
                        }),
                    }),
                },
            })

            expect(result.toolCalls).toHaveLength(1)
            const toolCall = result.toolCalls[0]
            expect(toolCall).toBeDefined()
            expect(toolCall!.toolCallId).toBe('call_abc123')
            expect(toolCall!.toolName).toBe('get_weather')
            expect(result.finishReason).toBe('tool-calls')
        })

        it('should handle multiple tool calls', async () => {
            const { requesty } = mockRequesty(() =>
                chatCompletion({
                    choices: [
                        {
                            index: 0,
                            message: {
                                role: 'assistant',
                                content: null,
                                tool_calls: [
                                    {
                                        id: 'call_weather',
                                        type: 'function',
                                        function: {
                                            name: 'get_weather',
                                            arguments:
                                                '{"location":"New York"}',
                                        },
                                    },
                                    {
                                        id: 'call_time',
                                        type: 'function',
                                        function: {
                                            name: 'get_time',
                                            arguments: '{"timezone":"EST"}',
                                        },
                                    },
                                ],
                            },
                            finish_reason: 'tool_calls',
                        },
                    ],
                }),
            )

            const result = await generateText({
                model: requesty.chat('openai/gpt-4o-mini'),
                messages: [
                    {
                        role: 'user',
                        content: 'What is the weather and time in New York?',
                    },
                ],
                tools: {
                    get_weather: tool({
                        description: 'Get the weather',
                        inputSchema: z.object({ location: z.string() }),
                    }),
                    get_time: tool({
                        description: 'Get the time',
                        inputSchema: z.object({ timezone: z.string() }),
                    }),
                },
            })

            expect(result.toolCalls).toHaveLength(2)
            const toolCall0 = result.toolCalls[0]
            const toolCall1 = result.toolCalls[1]
            expect(toolCall0).toBeDefined()
            expect(toolCall1).toBeDefined()
            expect(toolCall0!.toolCallId).toBe('call_weather')
            expect(toolCall0!.toolName).toBe('get_weather')
            expect(toolCall1!.toolCallId).toBe('call_time')
            expect(toolCall1!.toolName).toBe('get_time')
        })
    })

    describe('streamText', () => {
        it('should handle streaming text', async () => {
            const { requesty } = mockRequesty(() =>
                chatCompletionStream([
                    streamChunk({
                        delta: { role: 'assistant', content: 'Hello' },
                    }),
                    streamChunk({ delta: { content: ' world' } }),
                    streamChunk(
                        { delta: {}, finish_reason: 'stop' },
                        {
                            prompt_tokens: 10,
                            completion_tokens: 5,
                            total_tokens: 15,
                        },
                    ),
                ]),
            )

            const result = streamText({
                model: requesty.chat('openai/gpt-4o-mini'),
                messages: [{ role: 'user', content: 'Say hello' }],
            })

            const chunks: string[] = []
            for await (const chunk of result.textStream) {
                chunks.push(chunk)
            }

            expect(chunks.join('')).toBe('Hello world')

            expect(await result.finishReason).toBe('stop')

            const usage = await result.usage
            expect(usage.inputTokens).toBe(10)
            expect(usage.outputTokens).toBe(5)
            expect(usage.totalTokens).toBe(15)
        })

        it('should handle streaming tool calls', async () => {
            const { requesty } = mockRequesty(() =>
                chatCompletionStream([
                    streamChunk({
                        delta: {
                            role: 'assistant',
                            tool_calls: [
                                {
                                    index: 0,
                                    id: 'call_123',
                                    type: 'function',
                                    function: {
                                        name: 'get_weather',
                                        arguments: '{"location"',
                                    },
                                },
                            ],
                        },
                    }),
                    streamChunk({
                        delta: {
                            tool_calls: [
                                {
                                    index: 0,
                                    function: { arguments: ':"NYC"}' },
                                },
                            ],
                        },
                    }),
                    streamChunk(
                        { delta: {}, finish_reason: 'tool_calls' },
                        {
                            prompt_tokens: 20,
                            completion_tokens: 15,
                            total_tokens: 35,
                        },
                    ),
                ]),
            )

            const result = streamText({
                model: requesty.chat('openai/gpt-4o-mini'),
                messages: [
                    { role: 'user', content: 'What is the weather in NYC?' },
                ],
                tools: {
                    get_weather: tool({
                        description: 'Get the weather',
                        inputSchema: z.object({ location: z.string() }),
                    }),
                },
            })

            const toolCalls = await result.toolCalls

            expect(toolCalls).toHaveLength(1)
            expect(toolCalls[0]!.toolCallId).toBe('call_123')
            expect(toolCalls[0]!.toolName).toBe('get_weather')
            expect(toolCalls[0]!.input).toEqual({ location: 'NYC' })
        })

        it('should handle streaming multiple tool calls', async () => {
            const { requesty } = mockRequesty(() =>
                chatCompletionStream([
                    streamChunk({
                        delta: {
                            role: 'assistant',
                            tool_calls: [
                                {
                                    index: 0,
                                    id: 'call_weather',
                                    type: 'function',
                                    function: {
                                        name: 'get_weather',
                                        arguments: '{"location":"SF"}',
                                    },
                                },
                                {
                                    index: 1,
                                    id: 'call_time',
                                    type: 'function',
                                    function: {
                                        name: 'get_time',
                                        arguments: '{"timezone":"PST"}',
                                    },
                                },
                            ],
                        },
                    }),
                    streamChunk(
                        { delta: {}, finish_reason: 'tool_calls' },
                        {
                            prompt_tokens: 25,
                            completion_tokens: 20,
                            total_tokens: 45,
                        },
                    ),
                ]),
            )

            const result = streamText({
                model: requesty.chat('openai/gpt-4o-mini'),
                messages: [
                    { role: 'user', content: 'Weather and time in SF?' },
                ],
                tools: {
                    get_weather: tool({
                        description: 'Get the weather',
                        inputSchema: z.object({ location: z.string() }),
                    }),
                    get_time: tool({
                        description: 'Get the time',
                        inputSchema: z.object({ timezone: z.string() }),
                    }),
                },
            })

            const toolCalls = await result.toolCalls

            expect(toolCalls).toHaveLength(2)
            expect(toolCalls[0]!.toolCallId).toBe('call_weather')
            expect(toolCalls[0]!.toolName).toBe('get_weather')
            expect(toolCalls[0]!.input).toEqual({ location: 'SF' })
            expect(toolCalls[1]!.toolCallId).toBe('call_time')
            expect(toolCalls[1]!.toolName).toBe('get_time')
            expect(toolCalls[1]!.input).toEqual({ timezone: 'PST' })
        })
    })
})
