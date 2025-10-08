import type { LanguageModelV2Message } from '@ai-sdk/provider'
import { describe, expect, it } from 'vitest'
import type { RequestyChatMessage } from '../types'
import { handleAssistantMessage } from './handle-assistant-message'

describe('assistant messages', () => {
    it.for<
        [
            string,
            Extract<LanguageModelV2Message, { role: 'assistant' }>,
            RequestyChatMessage,
        ]
    >([
        [
            'text only',
            {
                role: 'assistant',
                content: [
                    {
                        type: 'text',
                        text: 'Hello, how can I help you?',
                    },
                ],
            },
            {
                role: 'assistant',
                content: 'Hello, how can I help you?',
            },
        ],
        [
            'multiple text parts',
            {
                role: 'assistant',
                content: [
                    {
                        type: 'text',
                        text: 'Hello, ',
                    },
                    {
                        type: 'text',
                        text: 'world!',
                    },
                ],
            },
            {
                role: 'assistant',
                content: 'Hello, world!',
            },
        ],
        [
            'empty text',
            {
                role: 'assistant',
                content: [
                    {
                        type: 'text',
                        text: '',
                    },
                ],
            },
            {
                role: 'assistant',
                content: '',
            },
        ],
        [
            'no text content',
            {
                role: 'assistant',
                content: [],
            },
            {
                role: 'assistant',
                content: null,
            },
        ],
        [
            'reasoning only',
            {
                role: 'assistant',
                content: [
                    {
                        type: 'reasoning',
                        text: 'Let me think about this...',
                    },
                ],
            },
            {
                role: 'assistant',
                content: null,
                reasoning: 'Let me think about this...',
            },
        ],
        [
            'multiple reasoning parts',
            {
                role: 'assistant',
                content: [
                    {
                        type: 'reasoning',
                        text: 'First, ',
                    },
                    {
                        type: 'reasoning',
                        text: 'then...',
                    },
                ],
            },
            {
                role: 'assistant',
                content: null,
                reasoning: 'First, then...',
            },
        ],
        [
            'text and reasoning',
            {
                role: 'assistant',
                content: [
                    {
                        type: 'reasoning',
                        text: 'Thinking...',
                    },
                    {
                        type: 'text',
                        text: 'Here is my answer.',
                    },
                ],
            },
            {
                role: 'assistant',
                content: 'Here is my answer.',
                reasoning: 'Thinking...',
            },
        ],
        [
            'single tool call',
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
            {
                role: 'assistant',
                content: null,
                tool_calls: [
                    {
                        id: 'call_123',
                        type: 'function',
                        function: {
                            name: 'get_weather',
                            arguments: '{"location":"San Francisco"}',
                        },
                    },
                ],
            },
        ],
        [
            'multiple tool calls',
            {
                role: 'assistant',
                content: [
                    {
                        type: 'tool-call',
                        toolCallId: 'call_123',
                        toolName: 'get_weather',
                        input: { location: 'San Francisco' },
                    },
                    {
                        type: 'tool-call',
                        toolCallId: 'call_456',
                        toolName: 'get_time',
                        input: { timezone: 'PST' },
                    },
                ],
            },
            {
                role: 'assistant',
                content: null,
                tool_calls: [
                    {
                        id: 'call_123',
                        type: 'function',
                        function: {
                            name: 'get_weather',
                            arguments: '{"location":"San Francisco"}',
                        },
                    },
                    {
                        id: 'call_456',
                        type: 'function',
                        function: {
                            name: 'get_time',
                            arguments: '{"timezone":"PST"}',
                        },
                    },
                ],
            },
        ],
        [
            'text and tool calls',
            {
                role: 'assistant',
                content: [
                    {
                        type: 'text',
                        text: 'Let me check that for you.',
                    },
                    {
                        type: 'tool-call',
                        toolCallId: 'call_789',
                        toolName: 'search',
                        input: { query: 'test' },
                    },
                ],
            },
            {
                role: 'assistant',
                content: 'Let me check that for you.',
                tool_calls: [
                    {
                        id: 'call_789',
                        type: 'function',
                        function: {
                            name: 'search',
                            arguments: '{"query":"test"}',
                        },
                    },
                ],
            },
        ],
        [
            'text, reasoning, and tool calls',
            {
                role: 'assistant',
                content: [
                    {
                        type: 'reasoning',
                        text: 'I need to search for this.',
                    },
                    {
                        type: 'text',
                        text: 'Looking that up...',
                    },
                    {
                        type: 'tool-call',
                        toolCallId: 'call_999',
                        toolName: 'search',
                        input: { query: 'answer' },
                    },
                ],
            },
            {
                role: 'assistant',
                content: 'Looking that up...',
                reasoning: 'I need to search for this.',
                tool_calls: [
                    {
                        id: 'call_999',
                        type: 'function',
                        function: {
                            name: 'search',
                            arguments: '{"query":"answer"}',
                        },
                    },
                ],
            },
        ],
        [
            'skips file and tool-result content',
            {
                role: 'assistant',
                content: [
                    {
                        type: 'text',
                        text: 'Here you go.',
                    },
                    {
                        type: 'file',
                        data: new Uint8Array([1, 2, 3]),
                        mediaType: 'image/png',
                    },
                    {
                        type: 'tool-result',
                        toolCallId: 'call_000',
                        toolName: 'test',
                        result: { data: 'value' },
                    } as any,
                ],
            },
            {
                role: 'assistant',
                content: 'Here you go.',
            },
        ],
    ])(
        'converts assistant messages: %s',
        ([_testName, message, expectedMessage]) =>
            expect(handleAssistantMessage(message)).toStrictEqual(
                expectedMessage,
            ),
    )
})
