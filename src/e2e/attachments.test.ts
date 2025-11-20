import { generateText } from 'ai'
import { describe, expect, it } from 'vitest'
import { createRequesty } from '..'
import {
    IMAGE_URL,
    PDF_URL,
    SMALL_BASE64_IMAGE,
    SMALL_BASE64_PDF,
} from './assets'
import { getTestModels } from './get-models'

const requesty = createRequesty({
    apiKey: process.env.REQUESTY_API_KEY,
    baseURL: process.env.REQUESTY_BASE_URL,
})

const modelsToTest = getTestModels()

// openai/ doesn't support attachments, you need to use openai-responses/ for that
const attachmentCapableModels = modelsToTest.filter(
    (m) => !(m.name.startsWith('mistral/') || m.name.startsWith('openai/')),
)

function toDataUrl(base64Data: string, mediaType: string): string {
    return `data:${mediaType};base64,${base64Data}`
}

describe.concurrent.each(attachmentCapableModels)(
    'Attachments - $name',
    ({ id }) => {
        const model = requesty.chat(id)
        it('should handle images being attached as base64', async () => {
            const { text } = await generateText({
                model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'describe this',
                            },
                            {
                                type: 'image',
                                image: SMALL_BASE64_IMAGE,
                                mediaType: 'image/png',
                            },
                        ],
                    },
                ],
            })

            expect(text.length).toBeGreaterThan(0)
        })

        it('should handle image being attached as URL', async () => {
            const { text } = await generateText({
                model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'describe this',
                            },
                            {
                                type: 'image',
                                image: IMAGE_URL,
                                mediaType: 'image/png',
                            },
                        ],
                    },
                ],
            })

            expect(text.length).toBeGreaterThan(0)
        })

        it('should handle PDFs being attached as base64', async () => {
            const { text } = await generateText({
                model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'describe this',
                            },
                            {
                                type: 'file',
                                filename: 'my-pdf.pdf',
                                mediaType: 'application/pdf',
                                data: SMALL_BASE64_PDF,
                            },
                        ],
                    },
                ],
            })

            expect(text.length).toBeGreaterThan(0)
        })

        it('should handle PDFs as data URL', async () => {
            const { text } = await generateText({
                model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'describe this',
                            },
                            {
                                type: 'file',
                                mediaType: 'application/pdf',
                                data: toDataUrl(
                                    SMALL_BASE64_PDF,
                                    'application/pdf',
                                ),
                            },
                        ],
                    },
                ],
            })

            expect(text.length).toBeGreaterThan(0)
        })

        it('should handle PDFs as URLs', async () => {
            const { text } = await generateText({
                model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'describe this',
                            },
                            {
                                type: 'file',
                                filename: 'my-pdf.pdf',
                                mediaType: 'application/pdf',
                                data: PDF_URL,
                            },
                        ],
                    },
                ],
            })

            expect(text.length).toBeGreaterThan(0)
        })
    },
)
