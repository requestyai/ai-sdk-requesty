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

function toBase64DataUrl(base64Data: string, mediaType: string): string {
    return `data:${mediaType};base64,${base64Data}`
}

function transformUrl({
    data,
    mediaType,
}: LanguageModelV2FilePart): [string, boolean] {
    if (data instanceof Uint8Array) {
        const base64 = Buffer.from(data).toString('base64')
        return [toBase64DataUrl(base64, mediaType), true]
    }

    if (data instanceof URL) {
        return [data.href, false]
    }

    if (typeof data === 'string') {
        if (data.startsWith('data:')) {
            return [data, true]
        } else if (data.startsWith('http://') || data.startsWith('https://')) {
            return [data, false]
        } else {
            return [toBase64DataUrl(data, mediaType), true]
        }
    }

    throw new Error('Unsupported content type')
}

function handleUserFileImageMessage(
    part: LanguageModelV2FilePart,
): RequestyImagePart {
    const [url, isDataUrl] = transformUrl(part)
    return {
        type: 'image_url',
        image_url: {
            url,
            // gemini models need a mime_type when working with URLs
            ...(!isDataUrl && { media_type: part.mediaType }),
        },
    }
}

function handleUserFilePDFMessage(
    part: LanguageModelV2FilePart,
): RequestyFilePart {
    const [url] = transformUrl(part)
    return {
        type: 'input_file',
        file_data: url,
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
        throw new Error(`${part.mediaType} mediaType not supported`)
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
