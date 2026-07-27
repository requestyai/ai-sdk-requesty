import type { RequestyProvider } from '../requesty-provider'
import { createRequesty } from '../requesty-provider'

export const BASE_URL = 'http://test.requesty.ai/v1'

/**
 * Creates a Requesty provider whose `fetch` is mocked, so tests never hit the
 * network. The returned `requestBody()` exposes the JSON body that was sent to
 * the API, and `requestUrl()` the URL it was sent to.
 */
export const mockRequesty = (
    respond: () => Response,
): {
    requesty: RequestyProvider
    requestUrl: () => string
    requestBody: () => Record<string, unknown>
} => {
    let url: string | undefined
    let body: Record<string, unknown> | undefined

    const requesty = createRequesty({
        apiKey: 'test-api-key',
        baseURL: BASE_URL,
        fetch: async (input, init) => {
            url = input.toString()
            body = JSON.parse(String(init?.body))
            return respond()
        },
    })

    return {
        requesty,
        requestUrl: () => {
            if (url === undefined) throw new Error('no request was made')
            return url
        },
        requestBody: () => {
            if (body === undefined) throw new Error('no request was made')
            return body
        },
    }
}

/**
 * A non-streaming `/chat/completions` response.
 */
export const chatCompletion = (
    overrides: Record<string, unknown> = {},
): Response =>
    Response.json({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'openai/gpt-4o-mini',
        choices: [
            {
                index: 0,
                message: { role: 'assistant', content: 'ok' },
                finish_reason: 'stop',
            },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        ...overrides,
    })

/**
 * A streaming `/chat/completions` response. Each chunk is serialized as an SSE
 * `data:` event, followed by the terminating `[DONE]` event.
 */
export const chatCompletionStream = (
    chunks: Record<string, unknown>[],
): Response => {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
                )
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
        },
    })

    return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
    })
}

/**
 * Builds a single streaming chunk with the shared envelope fields filled in.
 */
export const streamChunk = (
    choice: Record<string, unknown>,
    usage?: Record<string, number>,
): Record<string, unknown> => ({
    id: 'chatcmpl-123',
    object: 'chat.completion.chunk',
    created: 1677652288,
    model: 'openai/gpt-4o-mini',
    choices: [{ index: 0, finish_reason: null, ...choice }],
    ...(usage ? { usage } : {}),
})
