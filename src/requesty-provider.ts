import type {
  RequestyChatModelId,
  RequestyChatSettings,
} from './requesty-chat-settings';
import type {
  RequestyCompletionModelId,
  RequestyCompletionSettings,
} from './requesty-completion-settings';

import { loadApiKey, withoutTrailingSlash } from '@ai-sdk/provider-utils';

import { RequestyChatLanguageModel } from './requesty-chat-language-model';
import { RequestyCompletionLanguageModel } from './requesty-completion-language-model';

export type { RequestyCompletionSettings };

export interface RequestyProvider {
  (
    modelId: RequestyChatModelId,
    settings?: RequestyCompletionSettings,
  ): RequestyCompletionLanguageModel;
  (
    modelId: RequestyChatModelId,
    settings?: RequestyChatSettings,
  ): RequestyChatLanguageModel;

  languageModel(
    modelId: RequestyChatModelId,
    settings?: RequestyCompletionSettings,
  ): RequestyCompletionLanguageModel;
  languageModel(
    modelId: RequestyChatModelId,
    settings?: RequestyChatSettings,
  ): RequestyChatLanguageModel;

  /**
Creates an Requesty chat model for text generation.
   */
  chat(
    modelId: RequestyChatModelId,
    settings?: RequestyChatSettings,
  ): RequestyChatLanguageModel;

  /**
Creates an Requesty completion model for text generation.
   */
  completion(
    modelId: RequestyCompletionModelId,
    settings?: RequestyCompletionSettings,
  ): RequestyCompletionLanguageModel;
}

export interface RequestyProviderSettings {
  /**
Base URL for the Requesty API calls.
     */
  baseURL?: string;

  /**
@deprecated Use `baseURL` instead.
     */
  baseUrl?: string;

  /**
API key for authenticating requests.
     */
  apiKey?: string;

  /**
Custom headers to include in the requests.
     */
  headers?: Record<string, string>;

  /**
Requesty compatibility mode. Should be set to `strict` when using the Requesty API,
and `compatible` when using 3rd party providers. In `compatible` mode, newer
information such as streamOptions are not being sent. Defaults to 'compatible'.
   */
  compatibility?: 'strict' | 'compatible';

  /**
Custom fetch implementation. You can use it as a middleware to intercept requests,
or to provide a custom fetch implementation for e.g. testing.
    */
  fetch?: typeof fetch;

  /**
A JSON object to send as the request body to access Requesty features & upstream provider features.
  */
  extraBody?: Record<string, unknown>;
}

/**
Create an Requesty provider instance.
 */
export function createRequesty(
  options: RequestyProviderSettings = {},
): RequestyProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL ?? options.baseUrl) ??
    'https://router.requesty.ai/v1';

  // we default to compatible, because strict breaks providers like Groq:
  const compatibility = options.compatibility ?? 'compatible';

  const getHeaders = () => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: 'REQUESTY_API_KEY',
      description: 'Requesty',
    })}`,
    ...options.headers,
  });

  const createChatModel = (
    modelId: RequestyChatModelId,
    settings: RequestyChatSettings = {},
  ) =>
    new RequestyChatLanguageModel(modelId, settings, {
      provider: 'requesty.chat',
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      compatibility,
      fetch: options.fetch,
      extraBody: options.extraBody,
    });

  const createCompletionModel = (
    modelId: RequestyCompletionModelId,
    settings: RequestyCompletionSettings = {},
  ) =>
    new RequestyCompletionLanguageModel(modelId, settings, {
      provider: 'requesty.completion',
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      compatibility,
      fetch: options.fetch,
      extraBody: options.extraBody,
    });

  const createLanguageModel = (
    modelId: RequestyChatModelId | RequestyCompletionModelId,
    settings?: RequestyChatSettings | RequestyCompletionSettings,
  ) => {
    if (new.target) {
      throw new Error(
        'The Requesty model function cannot be called with the new keyword.',
      );
    }

    if (modelId === 'openai/gpt-3.5-turbo-instruct') {
      return createCompletionModel(
        modelId,
        settings as RequestyCompletionSettings,
      );
    }

    return createChatModel(modelId, settings as RequestyChatSettings);
  };

  const provider = function (
    modelId: RequestyChatModelId | RequestyCompletionModelId,
    settings?: RequestyChatSettings | RequestyCompletionSettings,
  ) {
    return createLanguageModel(modelId, settings);
  };

  provider.languageModel = createLanguageModel;
  provider.chat = createChatModel;
  provider.completion = createCompletionModel;

  return provider as RequestyProvider;
}

/**
Default Requesty provider instance. It uses 'strict' compatibility mode.
 */
export const requesty = createRequesty({
  compatibility: 'strict', // strict for Requesty API
});
