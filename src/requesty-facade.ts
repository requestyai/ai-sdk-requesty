import { loadApiKey, withoutTrailingSlash } from '@ai-sdk/provider-utils'
import { RequestyChatLanguageModel } from './requesty-chat-language-model'
import type {
    RequestyChatModelId,
    RequestyChatSettings,
} from './requesty-chat-settings'
import { RequestyCompletionLanguageModel } from './requesty-completion-language-model'
import type {
    RequestyCompletionModelId,
    RequestyCompletionSettings,
} from './requesty-completion-settings'
import type { RequestyProviderSettings } from './requesty-provider'

/**
@deprecated Use `createRequesty` instead.
 */
export class Requesty {
    /**
  
     */
    readonly baseURL: string

    /**
  API key that is being send using the `Authorization` header.
  It defaults to the `REQUESTY_API_KEY` environment variable.
   */
    readonly apiKey?: string

    /**
  Custom headers to include in the requests.
     */
    readonly headers?: Record<string, string>

    /**
     * Creates a new Requesty provider instance.
     */
    constructor(options: RequestyProviderSettings = {}) {
        this.baseURL =
            withoutTrailingSlash(options.baseURL ?? options.baseUrl) ??
            'https://router.requesty.ai/v1'
        this.apiKey = options.apiKey
        this.headers = options.headers
    }

    private get baseConfig() {
        return {
            baseURL: this.baseURL,
            headers: () => ({
                Authorization: `Bearer ${loadApiKey({
                    apiKey: this.apiKey,
                    environmentVariableName: 'REQUESTY_API_KEY',
                    description: 'Requesty',
                })}`,
                ...this.headers,
            }),
        }
    }

    chat(modelId: RequestyChatModelId, settings: RequestyChatSettings = {}) {
        return new RequestyChatLanguageModel(modelId, settings, {
            provider: 'requesty.chat',
            ...this.baseConfig,
            compatibility: 'strict',
            url: ({ path }) => `${this.baseURL}${path}`,
        })
    }

    completion(
        modelId: RequestyCompletionModelId,
        settings: RequestyCompletionSettings = {},
    ) {
        return new RequestyCompletionLanguageModel(modelId, settings, {
            provider: 'requesty.completion',
            ...this.baseConfig,
            compatibility: 'strict',
            url: ({ path }) => `${this.baseURL}${path}`,
        })
    }
}
