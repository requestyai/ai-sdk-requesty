import type { LanguageModelV2 } from '@ai-sdk/provider'

/**
 * Language models from Requesty
 */
export type RequestyLanguageModel = LanguageModelV2

export type RequestyProviderOptions = {
    /**
     * Include reasoning in the response (when supported)
     * https://docs.requesty.ai/features/reasoning
     */
    includeReasoning?: boolean

    /**
     * Reasoning effort (when supported)
     * - 'low', 'medium', 'high': Standard effort levels
     * - 'max': Maximum effort (Requesty-specific)
     * - String numbers (e.g., '1000'): Specific token budget
     */
    reasoningEffort?: 'low' | 'medium' | 'high' | 'max' | string

    /**
     * A unique identifier representing your end-user, which can
     * help Requesty to monitor and detect abuse.
     */
    user?: string

    /**
     * Extra body to pass to the API (provider specific)
     */
    extraBody?: Record<string, any>
}

export type RequestySharedSettings = RequestyProviderOptions & {
    /**
     * List of compatible provider models to route to.
     */
    models?: string[]
}

export type RequestyUsage = {
    cachingTokens?: number
    cachedTokens?: number
}

export type RequestyProviderMetadata = {
    requesty?: {
        usage?: RequestyUsage
    }
}

export type RequestUserObjectContentParts = Array<
    RequestyTextPart | RequestyDocumentPart
>

export interface RequestyChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string | null | RequestUserObjectContentParts
    tool_call_id?: string
    tool_calls?: RequestyToolCall[]
    reasoning?: string
}

export type RequestyChatPrompt = RequestyChatMessage[]

export interface RequestyTextPart {
    type: 'text'
    text: string
}

export interface RequestyImagePart {
    type: 'image_url'
    image_url: {
        url: string
    }
}

export interface RequestyFilePart {
    type: 'input_file'
    filename: string
    file_data: string
}

export type RequestyDocumentPart = RequestyImagePart | RequestyFilePart

export interface RequestyToolCall {
    id: string
    type: 'function'
    function: {
        name: string
        arguments: string
    }
}
