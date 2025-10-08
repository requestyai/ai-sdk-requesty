import type { LanguageModelV2Prompt } from 'ai'
import { describe, it, expect } from 'vitest'
import { convertToRequestyChatMessages } from './convert-to-requesty-chat-messages.js'

describe('Image Handling', () => {
    it('should handle base64 data URLs', () => {
        const prompt: LanguageModelV2Prompt = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Describe:' },
                    {
                        type: 'image',
                        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                    },
                ],
            },
        ]

        const result = convertToRequestyChatMessages(prompt)

        expect(result[0].content).toEqual([
            { type: 'text', text: 'Describe:' },
            {
                type: 'image_url',
                image_url: {
                    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                },
            },
        ])
    })

    it('should handle raw base64 strings', () => {
        const prompt: LanguageModelV2Prompt = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                        mimeType: 'image/png',
                    },
                ],
            },
        ]

        const result = convertToRequestyChatMessages(prompt)
        const imageUrl = (result[0].content as any)[0].image_url.url

        expect(imageUrl).toContain('data:image/png;base64,')
        expect(imageUrl).toContain(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        )
    })

    it('should handle HTTP URLs', () => {
        const prompt: LanguageModelV2Prompt = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        image: 'https://example.com/image.jpg',
                    },
                ],
            },
        ]

        const result = convertToRequestyChatMessages(prompt)

        expect((result[0].content as any)[0].image_url.url).toBe(
            'https://example.com/image.jpg',
        )
    })

    it('should consolidate text-only content', () => {
        const prompt: LanguageModelV2Prompt = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Hello ' },
                    { type: 'text', text: 'world!' },
                ],
            },
        ]

        const result = convertToRequestyChatMessages(prompt)

        expect(result[0].content).toBe('Hello world!')
    })
})
