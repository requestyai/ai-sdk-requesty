import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2CallWarning,
  LanguageModelV2Content,
  LanguageModelV2FinishReason,
  LanguageModelV2ResponseMetadata,
  LanguageModelV2StreamPart,
  LanguageModelV2Usage,
  SharedV2Headers,
  SharedV2ProviderMetadata,
} from '@ai-sdk/provider';
import type { ParseResult } from '@ai-sdk/provider-utils';
import type {
  RequestyCompletionModelId,
  RequestyCompletionSettings,
} from './requesty-completion-settings';

import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';

import { convertToRequestyCompletionPrompt } from './convert-to-requesty-completion-prompt';
import { mapRequestyFinishReason } from './map-requesty-finish-reason';
import { requestyFailedResponseHandler } from './requesty-error';

type RequestyCompletionConfig = {
  provider: string;
  compatibility: 'strict' | 'compatible';
  headers: () => Record<string, string | undefined>;
  url: (options: { modelId: string; path: string }) => string;
  fetch?: typeof fetch;
};

export class RequestyCompletionLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2';
  readonly provider: string;
  readonly modelId: RequestyCompletionModelId;
  readonly supportedUrls = {};

  readonly settings: RequestyCompletionSettings;
  private readonly config: RequestyCompletionConfig;

  constructor(
    modelId: RequestyCompletionModelId,
    settings: RequestyCompletionSettings,
    config: RequestyCompletionConfig,
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
    this.provider = config.provider;
  }

  private getArgs({
    prompt,
    maxOutputTokens,
    temperature,
    topP,
    frequencyPenalty,
    presencePenalty,
    seed,
    responseFormat,
    topK,
    stopSequences,
    providerOptions,
  }: LanguageModelV2CallOptions) {
    const extraCallingBody = providerOptions?.['requesty'] ?? {};

    return {
      // model id:
      model: this.modelId,

      // model specific settings:
      logit_bias: this.settings.logitBias,
      logprobs: this.settings.logprobs,
      suffix: this.settings.suffix,
      user: this.settings.user,

      // standardized settings:
      max_tokens: maxOutputTokens,
      temperature,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      seed,

      stop: stopSequences,
      response_format: responseFormat,
      top_k: topK,

      // prompt
      prompt: convertToRequestyCompletionPrompt(prompt),

      // extra body:
      ...extraCallingBody,
    };
  }

  async doGenerate(options: LanguageModelV2CallOptions): Promise<{
    content: Array<LanguageModelV2Content>;
    finishReason: LanguageModelV2FinishReason;
    usage: LanguageModelV2Usage;
    providerMetadata?: SharedV2ProviderMetadata;
    request?: {
      body?: unknown;
    };
    response?: LanguageModelV2ResponseMetadata & {
      headers?: SharedV2Headers;
      body?: unknown;
    };
    warnings: Array<LanguageModelV2CallWarning>;
  }> {
    const args = this.getArgs(options);

    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.url({
        path: '/completions',
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: requestyFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        RequestyCompletionResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { prompt: rawPrompt, ...rawSettings } = args;
    const choice = response.choices[0];

    if (!choice) {
      throw new Error('No choice in response');
    }

    const content: Array<LanguageModelV2Content> = [
      {
        type: 'text',
        text: choice.text,
      },
    ];

    return {
      content,
      finishReason: mapRequestyFinishReason(choice.finish_reason),
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      request: { body: rawSettings },
      response: {
        id: response.id ?? '',
        modelId: response.model ?? '',
        headers: responseHeaders,
        body: response,
      },
      warnings: [],
    };
  }

  async doStream(options: LanguageModelV2CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>;
    request?: {
      body?: unknown;
    };
    response?: {
      headers?: SharedV2Headers;
    };
  }> {
    const args = this.getArgs(options);

    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.url({
        path: '/completions',
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: {
        ...args,
        stream: true,
      },
      failedResponseHandler: requestyFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        RequestyCompletionStreamChunkSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { prompt: rawPrompt, ...rawSettings } = args;

    let finishReason: LanguageModelV2FinishReason = 'other';
    let usage: LanguageModelV2Usage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof RequestyCompletionStreamChunkSchema>>,
          LanguageModelV2StreamPart
        >({
          transform(chunk, controller) {
            // handle failed chunk parsing / validation:
            if (!chunk.success) {
              finishReason = 'error';
              controller.enqueue({ type: 'error', error: chunk.error });
              return;
            }

            const value = chunk.value;

            // handle error chunks:
            if ('error' in value) {
              finishReason = 'error';
              controller.enqueue({ type: 'error', error: value.error });
              return;
            }

            if (value.id) {
              controller.enqueue({
                type: 'response-metadata',
                id: value.id,
              });
            }

            if (value.model) {
              controller.enqueue({
                type: 'response-metadata',
                modelId: value.model,
              });
            }

            if (value.usage != null) {
              usage = {
                inputTokens: value.usage.prompt_tokens ?? 0,
                outputTokens: value.usage.completion_tokens ?? 0,
                totalTokens: value.usage.total_tokens ?? 0,
              };
            }

            const choice = value.choices?.[0];

            if (choice?.finish_reason != null) {
              finishReason = mapRequestyFinishReason(choice.finish_reason);
            }

            if (choice?.text != null) {
              controller.enqueue({
                type: 'text-delta',
                id: 'completion',
                delta: choice.text,
              });
            }
          },

          flush(controller) {
            controller.enqueue({
              type: 'finish',
              finishReason,
              usage,
            });
          },
        }),
      ),
      request: { body: rawSettings },
      response: { headers: responseHeaders },
    };
  }
}

const RequestyCompletionResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z.array(
    z.object({
      text: z.string(),
      finish_reason: z.string().nullable(),
      logprobs: z.any().optional(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

const RequestyCompletionStreamChunkSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        text: z.string().optional(),
        finish_reason: z.string().nullable().optional(),
        logprobs: z.any().optional(),
      }),
    )
    .optional(),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
  error: z.any().optional(),
});
