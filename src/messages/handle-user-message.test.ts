import type { LanguageModelV2Message } from '@ai-sdk/provider'
import { describe, expect, it } from 'vitest'
import type { RequestyChatMessage } from '../types'
import { handleUserMessage } from './handle-user-message'

describe('user messages', () => {
    it('converts simple user message with text', () => {
        const userMessage = handleUserMessage({
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: 'hello world, this is the user',
                },
            ],
        })

        expect(userMessage).toStrictEqual({
            content: 'hello world, this is the user',
            role: 'user',
        })
    })

    it('converts various user message with text', () => {
        const userMessage = handleUserMessage({
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: 'hello world, this is the user\n',
                },
                {
                    type: 'text',
                    text: 'this is some more text',
                },
            ],
        })

        expect(userMessage).toStrictEqual({
            content: 'hello world, this is the user\nthis is some more text',
            role: 'user',
        })
    })

    it.for<
        [
            string,
            Extract<LanguageModelV2Message, { role: 'user' }>,
            RequestyChatMessage,
        ]
    >([
        [
            'Uint8Array with image/png',
            {
                role: 'user',
                content: [
                    {
                        type: 'file',
                        data: new Uint8Array([0, 1, 2, 3]),
                        mediaType: 'image/png',
                    },
                ],
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: 'data:image/png;base64,AAECAw==',
                        },
                    },
                ],
            },
        ],
        [
            'Uint8Array with image/jpeg',
            {
                role: 'user',
                content: [
                    {
                        type: 'file',
                        data: new Uint8Array([255, 216, 255, 224]),
                        mediaType: 'image/jpeg',
                    },
                ],
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: 'data:image/jpeg;base64,/9j/4A==',
                        },
                    },
                ],
            },
        ],
        [
            'HTTPS URL string',
            {
                role: 'user',
                content: [
                    {
                        type: 'file',
                        data: 'https://example.com/image.png',
                        mediaType: 'image/png',
                    },
                ],
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            mime_type: 'image/png',
                            url: 'https://example.com/image.png',
                        },
                    },
                ],
            },
        ],
        [
            'Data URI string',
            {
                role: 'user',
                content: [
                    {
                        type: 'file',
                        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                        mediaType: 'image/png',
                    },
                ],
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                        },
                    },
                ],
            },
        ],
        [
            'Raw base64 string',
            {
                role: 'user',
                content: [
                    {
                        type: 'file',
                        data: 'AAECAw==',
                        mediaType: 'image/png',
                    },
                ],
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: 'data:image/png;base64,AAECAw==',
                        },
                    },
                ],
            },
        ],
        [
            'URL object',
            {
                role: 'user',
                content: [
                    {
                        type: 'file',
                        data: new URL('https://example.com/photo.jpg'),
                        mediaType: 'image/png',
                    },
                ],
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            mime_type: 'image/png',
                            url: 'https://example.com/photo.jpg',
                        },
                    },
                ],
            },
        ],
        [
            'HTTP URL string',
            {
                role: 'user',
                content: [
                    {
                        type: 'file',
                        data: 'http://example.com/image.webp',
                        mediaType: 'image/webp',
                    },
                ],
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            mime_type: 'image/webp',
                            url: 'http://example.com/image.webp',
                        },
                    },
                ],
            },
        ],
    ])(
        'converts file user messages: %s',
        ([_testName, message, expectedMessage]) =>
            expect(handleUserMessage(message)).toStrictEqual(expectedMessage),
    )

    it('converts user message with text and image', () => {
        const userMessage = handleUserMessage({
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: 'hello world, this is the user\n',
                },
                {
                    type: 'file',
                    data: new Uint8Array([0, 1, 2, 3]),
                    mediaType: 'image/png',
                },
            ],
        })

        expect(userMessage).toStrictEqual({
            content: [
                {
                    text: 'hello world, this is the user\n',
                    type: 'text',
                },
                {
                    image_url: {
                        url: 'data:image/png;base64,AAECAw==',
                    },
                    type: 'image_url',
                },
            ],
            role: 'user',
        })
    })

    it('converts user message with multiple text and images', () => {
        const userMessage = handleUserMessage({
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: 'hello world, this is the user\n',
                },
                {
                    type: 'file',
                    data: new Uint8Array([0, 1, 2, 3]),
                    mediaType: 'image/png',
                },
                {
                    type: 'text',
                    text: 'here is some out of place text',
                },
                {
                    type: 'file',
                    data: 'https://example.com/image.png',
                    mediaType: 'image/png',
                },
            ],
        })

        expect(userMessage).toStrictEqual({
            content: [
                {
                    text: 'hello world, this is the user\nhere is some out of place text',
                    type: 'text',
                },
                {
                    image_url: {
                        url: 'data:image/png;base64,AAECAw==',
                    },
                    type: 'image_url',
                },
                {
                    image_url: {
                        mime_type: 'image/png',
                        url: 'https://example.com/image.png',
                    },
                    type: 'image_url',
                },
            ],
            role: 'user',
        })
    })

    it('converts user message with pdf documents', () => {
        const userMessage = handleUserMessage({
            role: 'user',
            content: [
                {
                    type: 'file',
                    data: new Uint8Array([0, 1, 2, 3]),
                    mediaType: 'application/pdf',
                },
                {
                    type: 'file',
                    data: 'https://example.com/doc.pdf',
                    mediaType: 'application/pdf',
                },
            ],
        })

        expect(userMessage).toStrictEqual({
            content: [
                {
                    file_data: 'data:application/pdf;base64,AAECAw==',
                    filename: 'unnamed.pdf',
                    type: 'input_file',
                },
                {
                    file_data: 'https://example.com/doc.pdf',
                    filename: 'unnamed.pdf',
                    type: 'input_file',
                },
            ],
            role: 'user',
        })
    })
})
