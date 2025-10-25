import type {
    LanguageModelV3FilePart,
    LanguageModelV3Message,
} from '@ai-sdk/provider'
import type {
    RequestUserObjectContentParts,
    RequestyChatMessage,
    RequestyImagePart,
} from '../types'

function handleUserFileMessage({
    data,
    mediaType,
}: LanguageModelV3FilePart): RequestyImagePart {
    if (data instanceof Uint8Array) {
        const base64 = Buffer.from(data).toString('base64')
        return {
            type: 'image_url',
            image_url: {
                url: `data:${mediaType};base64,${base64}`,
            },
        }
    }

    if (data instanceof URL) {
        return {
            type: 'image_url',
            image_url: {
                url: data.href,
            },
        }
    }

    if (typeof data === 'string') {
        if (data.startsWith('data:')) {
            return {
                type: 'image_url',
                image_url: {
                    url: data,
                },
            }
        }

        if (data.startsWith('http://') || data.startsWith('https://')) {
            return {
                type: 'image_url',
                image_url: {
                    url: data,
                },
            }
        }

        return {
            type: 'image_url',
            image_url: {
                url: `data:${mediaType};base64,${data}`,
            },
        }
    }

    throw new Error('Unsupported content type')
}

export function handleUserMessage(
    message: Extract<LanguageModelV3Message, { role: 'user' }>,
): RequestyChatMessage {
    const includesImages = message.content.some((c) => c.type === 'file')
    if (!includesImages) {
        return {
            role: 'user',
            content: message.content
                .filter((c) => c.type === 'text')
                .map((c) => c.text)
                .join(''),
        }
    }

    const contentParts: RequestUserObjectContentParts = []

    const joinedTextContent = message.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('')
    const fileMessageParts = message.content
        .filter((c) => c.type === 'file')
        .map(handleUserFileMessage)

    if (joinedTextContent.length > 0) {
        contentParts.push({
            type: 'text',
            text: joinedTextContent,
        })
    }

    contentParts.push(...fileMessageParts)

    return {
        role: 'user',
        content: contentParts,
    }
}
