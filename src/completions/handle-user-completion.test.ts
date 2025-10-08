import { describe, expect, it } from 'vitest'
import { handleUserCompletion } from './handle-user-completion'

describe('handleUserCompletion', () => {
    it('converts simple text user message', () => {
        const result = handleUserCompletion(
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Hello, how are you?',
                    },
                ],
            },
            '',
        )

        expect(result).toBe('Hello, how are you?')
    })

    it('converts user message with stop sequence', () => {
        const result = handleUserCompletion(
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Hello',
                    },
                ],
            },
            '\n',
        )

        expect(result).toBe('Hello\n')
    })

    it('joins multiple text parts', () => {
        const result = handleUserCompletion(
            {
                role: 'user',
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

    it('handles URL file data', () => {
        const result = handleUserCompletion(
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Check this image: ',
                    },
                    {
                        type: 'file',
                        data: new URL('https://example.com/image.png'),
                        mediaType: 'image/png',
                    },
                ],
            },
            '',
        )

        expect(result).toBe('Check this image: https://example.com/image.png')
    })

    it('handles Uint8Array file data', () => {
        const result = handleUserCompletion(
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'File: ',
                    },
                    {
                        type: 'file',
                        data: new Uint8Array([1, 2, 3]),
                        mediaType: 'application/octet-stream',
                    },
                ],
            },
            '',
        )

        expect(result).toBe('File: [Binary file]')
    })

    it('handles string file data', () => {
        const result = handleUserCompletion(
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Data: ',
                    },
                    {
                        type: 'file',
                        data: 'base64string',
                        mediaType: 'image/png',
                    },
                ],
            },
            '',
        )

        expect(result).toBe('Data: base64string')
    })

    it('handles mixed content with stop sequence', () => {
        const result = handleUserCompletion(
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Text ',
                    },
                    {
                        type: 'file',
                        data: new URL('https://example.com/doc.pdf'),
                        mediaType: 'application/pdf',
                    },
                    {
                        type: 'text',
                        text: ' more text',
                    },
                ],
            },
            ' [END]',
        )

        expect(result).toBe('Text https://example.com/doc.pdf more text [END]')
    })
})
