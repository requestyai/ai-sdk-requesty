import type {
    LanguageModelV3Message,
    LanguageModelV3ToolResultPart,
} from '@ai-sdk/provider'
import { describe, expect, it } from 'vitest'
import type { RequestyChatMessage } from '../types'
import { handleToolContentPart, handleToolMessage } from './handle-tool-message'

describe('tool messages', () => {
    it.for<[string, LanguageModelV3ToolResultPart, string]>([
        [
            'text output',
            {
                type: 'tool-result',
                toolCallId: 'call_123',
                toolName: 'get_weather',
                output: {
                    type: 'text',
                    value: 'The weather is sunny.',
                },
            },
            'The weather is sunny.',
        ],
        [
            'error-text output',
            {
                type: 'tool-result',
                toolCallId: 'call_456',
                toolName: 'search',
                output: {
                    type: 'error-text',
                    value: 'Connection timeout',
                },
            },
            'Connection timeout',
        ],
        [
            'json output',
            {
                type: 'tool-result',
                toolCallId: 'call_789',
                toolName: 'get_data',
                output: {
                    type: 'json',
                    value: { temperature: 72, humidity: 65 },
                },
            },
            '{"temperature":72,"humidity":65}',
        ],
        [
            'error-json output',
            {
                type: 'tool-result',
                toolCallId: 'call_999',
                toolName: 'fetch',
                output: {
                    type: 'error-json',
                    value: { error: 'Not found', code: 404 },
                },
            },
            '{"error":"Not found","code":404}',
        ],
        [
            'content output with single text',
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
            'Result here',
        ],
        [
            'content output with multiple text parts',
            {
                type: 'tool-result',
                toolCallId: 'call_222',
                toolName: 'analyze',
                output: {
                    type: 'content',
                    value: [
                        {
                            type: 'text',
                            text: 'Part 1. ',
                        },
                        {
                            type: 'text',
                            text: 'Part 2.',
                        },
                    ],
                },
            },
            'Part 1. Part 2.',
        ],
        [
            'content output with media (skipped)',
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
            'Text part',
        ],
        [
            'content output with only media (empty result)',
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
            '',
        ],
        [
            'content output with empty array',
            {
                type: 'tool-result',
                toolCallId: 'call_555',
                toolName: 'empty',
                output: {
                    type: 'content',
                    value: [],
                },
            },
            '',
        ],
    ])(
        'handleToolContentPart: %s',
        ([_testName, contentPart, expectedContent]) =>
            expect(handleToolContentPart(contentPart)).toStrictEqual(
                expectedContent,
            ),
    )

    it.for<
        [
            string,
            Extract<LanguageModelV3Message, { role: 'tool' }>,
            Array<RequestyChatMessage>,
        ]
    >([
        [
            'single tool result with text',
            {
                role: 'tool',
                content: [
                    {
                        type: 'tool-result',
                        toolCallId: 'call_123',
                        toolName: 'get_weather',
                        output: {
                            type: 'text',
                            value: 'Sunny, 75°F',
                        },
                    },
                ],
            },
            [
                {
                    role: 'tool',
                    content: 'Sunny, 75°F',
                    tool_call_id: 'call_123',
                },
            ],
        ],
        [
            'single tool result with json',
            {
                role: 'tool',
                content: [
                    {
                        type: 'tool-result',
                        toolCallId: 'call_456',
                        toolName: 'get_data',
                        output: {
                            type: 'json',
                            value: { status: 'success' },
                        },
                    },
                ],
            },
            [
                {
                    role: 'tool',
                    content: '{"status":"success"}',
                    tool_call_id: 'call_456',
                },
            ],
        ],
        [
            'multiple tool results',
            {
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
                            type: 'json',
                            value: { data: 'B' },
                        },
                    },
                ],
            },
            [
                {
                    role: 'tool',
                    content: 'Result A',
                    tool_call_id: 'call_111',
                },
                {
                    role: 'tool',
                    content: '{"data":"B"}',
                    tool_call_id: 'call_222',
                },
            ],
        ],
        [
            'tool result with error-text',
            {
                role: 'tool',
                content: [
                    {
                        type: 'tool-result',
                        toolCallId: 'call_789',
                        toolName: 'failing_tool',
                        output: {
                            type: 'error-text',
                            value: 'Operation failed',
                        },
                    },
                ],
            },
            [
                {
                    role: 'tool',
                    content: 'Operation failed',
                    tool_call_id: 'call_789',
                },
            ],
        ],
        [
            'tool result with content type',
            {
                role: 'tool',
                content: [
                    {
                        type: 'tool-result',
                        toolCallId: 'call_999',
                        toolName: 'multi_content',
                        output: {
                            type: 'content',
                            value: [
                                {
                                    type: 'text',
                                    text: 'First part. ',
                                },
                                {
                                    type: 'text',
                                    text: 'Second part.',
                                },
                            ],
                        },
                    },
                ],
            },
            [
                {
                    role: 'tool',
                    content: 'First part. Second part.',
                    tool_call_id: 'call_999',
                },
            ],
        ],
    ])('handleToolMessage: %s', ([_testName, message, expectedMessages]) =>
        expect(handleToolMessage(message)).toStrictEqual(expectedMessages),
    )
})
