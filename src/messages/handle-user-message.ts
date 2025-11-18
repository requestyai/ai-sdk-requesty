import type {
    LanguageModelV2FilePart,
    LanguageModelV2Message,
} from '@ai-sdk/provider'
import type {
    RequestUserObjectContentParts,
    RequestyChatMessage,
    RequestyDocumentPart,
    RequestyFilePart,
    RequestyImagePart,
} from '../types'

const IMAGE_MEDIA_TYPE = 'image/'
const PDF_MEDIA_TYPE = 'application/pdf'

const DEFAULT_PDF_NAME = 'unnamed.pdf'

function toDataUrl(base64Data: string, mediaType: string): string {
    return `data:${mediaType};base64,${base64Data}`
}

function getDataUrl({ data, mediaType }: LanguageModelV2FilePart): string {
    if (data instanceof Uint8Array) {
        const base64 = Buffer.from(data).toString('base64')
        return toDataUrl(base64, mediaType)
    }

    if (data instanceof URL) {
        return data.href
    }

    if (typeof data === 'string') {
        if (
            data.startsWith('data:') ||
            data.startsWith('http://') ||
            data.startsWith('https://')
        ) {
            return data
        }

        return toDataUrl(data, mediaType)
    }

    throw new Error('Unsupported content type')
}

function handleUserFileImageMessage(
    part: LanguageModelV2FilePart,
): RequestyImagePart {
    return {
        type: 'image_url',
        image_url: {
            url: getDataUrl(part),
        },
    }
}

function handleUserFilePDFMessage(
    part: LanguageModelV2FilePart,
): RequestyFilePart {
    return {
        type: 'input_file',
        file_data: getDataUrl(part),
        filename: part.filename ?? DEFAULT_PDF_NAME,
    }
}

function handleUserFileMessage(
    part: LanguageModelV2FilePart,
): RequestyDocumentPart {
    if (part.mediaType.startsWith(IMAGE_MEDIA_TYPE)) {
        return handleUserFileImageMessage(part)
    } else if (part.mediaType === PDF_MEDIA_TYPE) {
        return handleUserFilePDFMessage(part)
    } else {
        throw new Error(`${part.mediaType} mediaType not implemented`)
    }
}

export function handleUserMessage(
    message: Extract<LanguageModelV2Message, { role: 'user' }>,
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
