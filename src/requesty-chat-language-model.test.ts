import { describe, expect, it } from 'vitest'
import { RequestyChatLanguageModel } from './requesty-chat-language-model'

const model = new RequestyChatLanguageModel(
    'gpt-4',
    {},
    {
        provider: 'test-provider',
        compatibility: 'strict',
        headers: () => ({}),
        url: () => 'https://api.example.com',
    },
)

const testAllRegexes = (arr: RegExp[], str: string): boolean => {
    return arr.some((a) => a.test(str))
}

describe('image/*', () => {
    it.for([
        'https://example.com/image.png',
        'http://example.com/image.jpg',
        'https://cdn.example.com/path/to/image.webp',
        'https://example.com/image.png?size=large',
        'https://example.com/image.png#section',
        'https://example.com/image.png?w=100&h=200#preview',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg',
        'data:image/jpeg;base64,/9j/4AAQSkZJRg',
        'data:image/webp;base64,UklGRiQAAABXRUJQ',
        'data:image/gif;base64,R0lGODlhAQABAIAA',
    ])('should accept %s', (url) => {
        const regex = model.supportedUrls['image/*']

        expect(regex).toBeDefined()
        expect(testAllRegexes(regex!, url)).toBeTruthy()
    })

    it.for([
        'ftp://example.com/image.png',
        '/local/path/image.png',
        '',
        'not-a-url',
        '://missing-protocol',
        'data:text/plain;base64,SGVsbG8=',
        'data:image/png,notbase64',
    ])('should reject %s', (url) => {
        const regex = model.supportedUrls['image/*']

        expect(regex).toBeDefined()
        expect(testAllRegexes(regex!, url)).toBeFalsy()
    })
})

describe('application/*', () => {
    it.for([
        'https://example.com/document.pdf',
        'http://example.com/data.json',
        'https://cdn.example.com/path/to/file.xlsx',
        'data:application/pdf,content',
        'data:application/json,{"key":"value"}',
        'data:application/octet-stream,binarydata',
        'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,data',
    ])('should accept %s', (url) => {
        const regex = model.supportedUrls['application/*']

        expect(regex).toBeDefined()
        expect(testAllRegexes(regex!, url)).toBeTruthy()
    })

    it.for([
        'ftp://example.com/document.pdf',
        '/local/path/document.pdf',
        'data:image/png;base64,iVBORw0KG',
        'data:text/plain,content',
    ])('should reject %s', (url) => {
        const regex = model.supportedUrls['application/*']

        expect(regex).toBeDefined()
        expect(testAllRegexes(regex!, url)).toBeFalsy()
    })
})
