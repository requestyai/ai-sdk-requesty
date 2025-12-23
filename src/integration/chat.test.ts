import { generateText, streamText, tool } from 'ai'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createRequesty } from '../requesty-provider'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Requesty Integration - Chat', () => {
    const requesty = createRequesty({
        apiKey: 'test-api-key',
        baseURL: 'http://test.requesty.ai/v1',
    })

    describe('generateText', () => {
        it('should handle basic chat completion', async () => {
            server.use(
                http.post('http://test.requesty.ai/v1/chat/completions', () => {
                    return HttpResponse.json({
                        id: 'chatcmpl-123',
                        object: 'chat.completion',
                        created: 1677652288,
                        model: 'openai/gpt-4o-mini',
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
                    })
                }),
            )

            const model = requesty.chat('openai/gpt-4o-mini')

            const result = await generateText({
                model,
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
            server.use(
                http.post('http://test.requesty.ai/v1/chat/completions', () => {
                    return HttpResponse.json({
                        id: 'chatcmpl-456',
                        object: 'chat.completion',
                        created: 1677652288,
                        model: 'openai/gpt-4o-mini',
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
                        usage: {
                            prompt_tokens: 20,
                            completion_tokens: 15,
                            total_tokens: 35,
                        },
                    })
                }),
            )

            const model = requesty.chat('openai/gpt-4o-mini')

            const result = await generateText({
                model,
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
            server.use(
                http.post('http://test.requesty.ai/v1/chat/completions', () => {
                    return HttpResponse.json({
                        id: 'chatcmpl-789',
                        object: 'chat.completion',
                        created: 1677652288,
                        model: 'openai/gpt-4o-mini',
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
                        usage: {
                            prompt_tokens: 25,
                            completion_tokens: 20,
                            total_tokens: 45,
                        },
                    })
                }),
            )

            const model = requesty.chat('openai/gpt-4o-mini')

            const result = await generateText({
                model,
                messages: [
                    {
                        role: 'user',
                        content: 'What is the weather and time in New York?',
                    },
                ],
                tools: {
                    get_weather: tool({
                        description: 'Get the weather',
                        inputSchema: z.object({
                            location: z.string(),
                        }),
                    }),
                    get_time: tool({
                        description: 'Get the time',
                        inputSchema: z.object({
                            timezone: z.string(),
                        }),
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
            server.use(
                http.post('http://test.requesty.ai/v1/chat/completions', () => {
                    const encoder = new TextEncoder()
                    const stream = new ReadableStream({
                        start(controller) {
                            controller.enqueue(
                                encoder.encode(
                                    'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"openai/gpt-4o-mini","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}\n\n',
                                ),
                            )
                            controller.enqueue(
                                encoder.encode(
                                    'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"openai/gpt-4o-mini","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}\n\n',
                                ),
                            )
                            controller.enqueue(
                                encoder.encode(
                                    'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"openai/gpt-4o-mini","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}\n\n',
                                ),
                            )
                            controller.enqueue(
                                encoder.encode('data: [DONE]\n\n'),
                            )
                            controller.close()
                        },
                    })

                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            Connection: 'keep-alive',
                        },
                    })
                }),
            )

            const model = requesty.chat('openai/gpt-4o-mini')

            const result = streamText({
                model,
                messages: [{ role: 'user', content: 'Say hello' }],
            })

            const chunks: string[] = []
            for await (const chunk of result.textStream) {
                chunks.push(chunk)
            }

            expect(chunks.join('')).toBe('Hello world')

            const finishReason = await result.finishReason
            const usage = await result.usage

            expect(finishReason).toBe('stop')
            expect(usage.inputTokens).toBe(10)
            expect(usage.outputTokens).toBe(5)
            expect(usage.totalTokens).toBe(15)
        })

        it('should handle streaming tool calls', async () => {
            server.use(
                http.post('http://test.requesty.ai/v1/chat/completions', () => {
                    const encoder = new TextEncoder()
                    const stream = new ReadableStream({
                        start(controller) {
                            controller.enqueue(
                                encoder.encode(
                                    'data: {"id":"chatcmpl-456","object":"chat.completion.chunk","created":1677652288,"model":"openai/gpt-4o-mini","choices":[{"index":0,"delta":{"role":"assistant","tool_calls":[{"index":0,"id":"call_123","type":"function","function":{"name":"get_weather","arguments":"{\\"location\\""}}]},"finish_reason":null}]}\n\n',
                                ),
                            )
                            controller.enqueue(
                                encoder.encode(
                                    'data: {"id":"chatcmpl-456","object":"chat.completion.chunk","created":1677652288,"model":"openai/gpt-4o-mini","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":":\\"NYC\\"}"}}]},"finish_reason":null}]}\n\n',
                                ),
                            )
                            controller.enqueue(
                                encoder.encode(
                                    'data: {"id":"chatcmpl-456","object":"chat.completion.chunk","created":1677652288,"model":"openai/gpt-4o-mini","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":20,"completion_tokens":15,"total_tokens":35}}\n\n',
                                ),
                            )
                            controller.enqueue(
                                encoder.encode('data: [DONE]\n\n'),
                            )
                            controller.close()
                        },
                    })

                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            Connection: 'keep-alive',
                        },
                    })
                }),
            )

            const model = requesty.chat('openai/gpt-4o-mini')

            const result = streamText({
                model,
                messages: [
                    { role: 'user', content: 'What is the weather in NYC?' },
                ],
                tools: {
                    get_weather: tool({
                        description: 'Get the weather',
                        inputSchema: z.object({
                            location: z.string(),
                        }),
                    }),
                },
            })

            const toolCalls: any[] = []
            for await (const chunk of result.fullStream) {
                if (chunk.type === 'tool-call') {
                    toolCalls.push(chunk)
                }
            }

            expect(toolCalls).toHaveLength(1)
            expect(toolCalls[0].type).toBe('tool-call')
            expect(toolCalls[0].toolCallId).toBe('call_123')
            expect(toolCalls[0].toolName).toBe('get_weather')
            expect(toolCalls[0].input).toEqual({ location: 'NYC' })
        })

        it('should handle streaming multiple tool calls', async () => {
            server.use(
                http.post('http://test.requesty.ai/v1/chat/completions', () => {
                    const encoder = new TextEncoder()
                    const stream = new ReadableStream({
                        start(controller) {
                            controller.enqueue(
                                encoder.encode(
                                    'data: {"id":"chatcmpl-789","object":"chat.completion.chunk","created":1677652288,"model":"openai/gpt-4o-mini","choices":[{"index":0,"delta":{"role":"assistant","tool_calls":[{"index":0,"id":"call_weather","type":"function","function":{"name":"get_weather","arguments":"{\\"location\\":\\"SF\\"}"}},{"index":1,"id":"call_time","type":"function","function":{"name":"get_time","arguments":"{\\"timezone\\":\\"PST\\"}"}}]},"finish_reason":null}]}\n\n',
                                ),
                            )
                            controller.enqueue(
                                encoder.encode(
                                    'data: {"id":"chatcmpl-789","object":"chat.completion.chunk","created":1677652288,"model":"openai/gpt-4o-mini","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":25,"completion_tokens":20,"total_tokens":45}}\n\n',
                                ),
                            )
                            controller.enqueue(
                                encoder.encode('data: [DONE]\n\n'),
                            )
                            controller.close()
                        },
                    })

                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                        },
                    })
                }),
            )

            const model = requesty.chat('openai/gpt-4o-mini')

            const result = streamText({
                model,
                messages: [
                    { role: 'user', content: 'Weather and time in SF?' },
                ],
                tools: {
                    get_weather: tool({
                        description: 'Get the weather',
                        inputSchema: z.object({
                            location: z.string(),
                        }),
                    }),
                    get_time: tool({
                        description: 'Get the time',
                        inputSchema: z.object({
                            timezone: z.string(),
                        }),
                    }),
                },
            })

            const toolCalls: any[] = []
            for await (const chunk of result.fullStream) {
                if (chunk.type === 'tool-call') {
                    toolCalls.push(chunk)
                }
            }

            expect(toolCalls).toHaveLength(2)
            expect(toolCalls[0].type).toBe('tool-call')
            expect(toolCalls[0].toolCallId).toBe('call_weather')
            expect(toolCalls[0].toolName).toBe('get_weather')
            expect(toolCalls[0].input).toEqual({ location: 'SF' })
            expect(toolCalls[1].type).toBe('tool-call')
            expect(toolCalls[1].toolCallId).toBe('call_time')
            expect(toolCalls[1].toolName).toBe('get_time')
            expect(toolCalls[1].input).toEqual({ timezone: 'PST' })
        })
    })
})
