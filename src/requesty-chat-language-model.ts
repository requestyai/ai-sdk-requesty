import type { RequestyUsage } from '@/src/types';
import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2CallWarning,
  LanguageModelV2Content,
  LanguageModelV2FinishReason,
  LanguageModelV2FunctionTool,
  LanguageModelV2ProviderDefinedTool,
  LanguageModelV2ResponseMetadata,
  LanguageModelV2StreamPart,
  LanguageModelV2Usage,
  SharedV2Headers,
  SharedV2ProviderMetadata,
} from '@ai-sdk/provider';
import type { ParseResult } from '@ai-sdk/provider-utils';
import type {
  RequestyChatModelId,
  RequestyChatSettings,
} from './requesty-chat-settings';

import {
  InvalidResponseDataError,
  UnsupportedFunctionalityError,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  generateId,
  isParsableJson,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';

import { convertToRequestyChatMessages } from './convert-to-requesty-chat-messages';
import { mapRequestyFinishReason } from './map-requesty-finish-reason';
import { requestyFailedResponseHandler } from './requesty-error';

function isFunctionTool(
  tool: LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool,
): tool is LanguageModelV2FunctionTool {
  return 'parameters' in tool;
}

type RequestyChatConfig = {
  provider: string;
  compatibility: 'strict' | 'compatible';
  headers: () => Record<string, string | undefined>;
  url: (options: { modelId: string; path: string }) => string;
  fetch?: typeof fetch;
  extraBody?: Record<string, unknown>;
};

export class RequestyChatLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2';
  readonly provider: string;
  readonly modelId: RequestyChatModelId;
  readonly supportedUrls = {};

  readonly settings: RequestyChatSettings;
  private readonly config: RequestyChatConfig;

  constructor(
    modelId: RequestyChatModelId,
    settings: RequestyChatSettings,
    config: RequestyChatConfig,
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
    stopSequences,
    responseFormat,
    topK,
    tools,
    toolChoice,
    providerOptions,
  }: LanguageModelV2CallOptions) {
    const extraCallingBody = providerOptions?.['requesty'] ?? {};

    const baseArgs = {
      // model id:
      model: this.modelId,
      models: this.settings.models,

      // model specific settings:
      logit_bias: this.settings.logitBias,
      logprobs:
        this.settings.logprobs === true ||
        typeof this.settings.logprobs === 'number'
          ? true
          : undefined,
      top_logprobs:
        typeof this.settings.logprobs === 'number'
          ? this.settings.logprobs
          : typeof this.settings.logprobs === 'boolean'
            ? this.settings.logprobs
              ? 0
              : undefined
            : undefined,
      user: this.settings.user,
      parallel_tool_calls: this.settings.parallelToolCalls,

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

      // messages:
      messages: convertToRequestyChatMessages(prompt),

      // Requesty specific settings:
      include_reasoning: this.settings.includeReasoning,
      reasoning_effort: this.settings.reasoningEffort,

      // extra body:
      ...this.config.extraBody,
      ...this.settings.extraBody,
      ...extraCallingBody,
    };

    // Handle tools and tool choice
    if (tools && tools.length > 0) {
      const { tools: mappedTools, tool_choice } = prepareToolsAndToolChoice({
        tools,
        toolChoice,
      });
      return { ...baseArgs, tools: mappedTools, tool_choice };
    }

    // Handle response format for object generation
    if (responseFormat?.type === 'json') {
      return {
        ...baseArgs,
        response_format: { type: 'json_object' },
      };
    }

    return baseArgs;
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
        path: '/chat/completions',
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: requestyFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        RequestyNonStreamChatCompletionResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { messages: rawPrompt, ...rawSettings } = args;
    const choice = response.choices[0];

    if (!choice) {
      throw new Error('No choice in response');
    }

    const providerMetadata = response.usage?.prompt_tokens_details
      ? ({
          requesty: {
            usage: {
              cachingTokens:
                response.usage.prompt_tokens_details.caching_tokens ?? 0,
              cachedTokens:
                response.usage.prompt_tokens_details.cached_tokens ?? 0,
            },
          },
        } satisfies SharedV2ProviderMetadata)
      : undefined;

    // Convert to content format
    const content: Array<LanguageModelV2Content> = [];

    // Add text content
    if (choice.message.content) {
      content.push({
        type: 'text',
        text: choice.message.content,
      });
    }

    // Add reasoning content if present
    if (choice.message.reasoning) {
      content.push({
        type: 'reasoning',
        text: choice.message.reasoning,
      });
    }

    // Add tool calls
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        content.push({
          type: 'tool-call',
          toolCallId: toolCall.id ?? generateId(),
          toolName: toolCall.function.name,
          input: isParsableJson(toolCall.function.arguments)
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments,
        });
      }
    }

    return {
      content,
      finishReason: mapRequestyFinishReason(choice.finish_reason),
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      ...(providerMetadata ? { providerMetadata } : {}),
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
        path: '/chat/completions',
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: {
        ...args,
        stream: true,

        // only include stream_options when in strict compatibility mode:
        stream_options:
          this.config.compatibility === 'strict'
            ? { include_usage: true }
            : undefined,
      },
      failedResponseHandler: requestyFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        RequestyStreamChatCompletionChunkSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { messages: rawPrompt, ...rawSettings } = args;

    const toolCalls: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
      sent: boolean;
    }> = [];

    let finishReason: LanguageModelV2FinishReason = 'other';
    let usage: LanguageModelV2Usage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    const requestyUsage: Partial<RequestyUsage> = {};

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof RequestyStreamChatCompletionChunkSchema>>,
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

              requestyUsage.cachingTokens =
                value.usage.prompt_tokens_details?.caching_tokens ?? 0;
              requestyUsage.cachedTokens =
                value.usage.prompt_tokens_details?.cached_tokens ?? 0;
            }

            const choice = value.choices?.[0];

            if (choice?.finish_reason != null) {
              finishReason = mapRequestyFinishReason(choice.finish_reason);
            }

            if (choice?.delta == null) {
              return;
            }

            const delta = choice.delta;

            if (delta.content != null) {
              controller.enqueue({
                type: 'text-delta',
                id: generateId(),
                delta: delta.content,
              });
            }

            if (delta.reasoning != null) {
              controller.enqueue({
                type: 'reasoning-delta',
                id: generateId(),
                delta: delta.reasoning,
              });
            }

            if (delta.tool_calls != null) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;

                // Tool call start. Requesty returns all information except the arguments in the first chunk.
                if (toolCalls[index] == null) {
                  if (toolCallDelta.type !== 'function') {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function' type.`,
                    });
                  }

                  if (toolCallDelta.id == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'id' to be a string.`,
                    });
                  }

                  if (toolCallDelta.function?.name == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function.name' to be a string.`,
                    });
                  }

                  toolCalls[index] = {
                    id: toolCallDelta.id,
                    type: 'function',
                    function: {
                      name: toolCallDelta.function.name,
                      arguments: toolCallDelta.function.arguments ?? '',
                    },
                    sent: false,
                  };

                  const toolCall = toolCalls[index];

                  if (toolCall == null) {
                    throw new Error('Tool call is missing');
                  }

                  // check if tool call is complete (some providers send the full tool call in one chunk)
                  if (
                    toolCall.function?.name != null &&
                    toolCall.function?.arguments != null &&
                    isParsableJson(toolCall.function.arguments)
                  ) {
                    // send delta
                    controller.enqueue({
                      type: 'tool-input-delta',
                      id: toolCall.id,
                      delta: toolCall.function.arguments,
                    });

                    // send tool call
                    controller.enqueue({
                      type: 'tool-call',
                      toolCallId: toolCall.id,
                      toolName: toolCall.function.name,
                      input: isParsableJson(toolCall.function.arguments)
                        ? JSON.parse(toolCall.function.arguments)
                        : toolCall.function.arguments,
                    });

                    toolCall.sent = true;
                  }

                  continue;
                }

                // existing tool call, merge
                const toolCall = toolCalls[index];

                if (toolCall == null) {
                  throw new Error('Tool call is missing');
                }

                if (toolCallDelta.function?.arguments != null) {
                  toolCall.function!.arguments +=
                    toolCallDelta.function?.arguments ?? '';
                }

                // send delta
                controller.enqueue({
                  type: 'tool-input-delta',
                  id: toolCall.id,
                  delta: toolCallDelta.function?.arguments ?? '',
                });

                // check if tool call is complete
                if (
                  toolCall.function?.name != null &&
                  toolCall.function?.arguments != null &&
                  isParsableJson(toolCall.function.arguments)
                ) {
                  controller.enqueue({
                    type: 'tool-call',
                    toolCallId: toolCall.id,
                    toolName: toolCall.function.name,
                    input: isParsableJson(toolCall.function.arguments)
                      ? JSON.parse(toolCall.function.arguments)
                      : toolCall.function.arguments,
                  });

                  toolCall.sent = true;
                }
              }
            }
          },

          flush(controller) {
            // Forward any unsent tool calls if finish reason is 'tool-calls'
            if (finishReason === 'tool-calls') {
              for (const toolCall of toolCalls) {
                if (!toolCall.sent) {
                  controller.enqueue({
                    type: 'tool-call',
                    toolCallId: toolCall.id,
                    toolName: toolCall.function.name,
                    input: isParsableJson(toolCall.function.arguments)
                      ? JSON.parse(toolCall.function.arguments)
                      : '{}',
                  });
                  toolCall.sent = true;
                }
              }
            }

            // Prepare provider metadata with Requesty usage information
            const providerMetadata: SharedV2ProviderMetadata = {
              requesty: {
                usage:
                  requestyUsage.cachedTokens !== undefined &&
                  requestyUsage.cachingTokens !== undefined
                    ? (requestyUsage as any)
                    : undefined,
              },
            };

            const hasProviderMetadata =
              providerMetadata.requesty?.usage !== undefined;

            controller.enqueue({
              type: 'finish',
              finishReason,
              usage,
              ...(hasProviderMetadata ? { providerMetadata } : {}),
            });
          },
        }),
      ),
      request: { body: rawSettings },
      response: { headers: responseHeaders },
    };
  }
}

const RequestyNonStreamChatCompletionResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.string(),
        content: z.string().nullable(),
        reasoning: z.string().optional(),
        tool_calls: z
          .array(
            z.object({
              id: z.string().nullable(),
              type: z.string(),
              function: z.object({
                name: z.string(),
                arguments: z.string(),
              }),
            }),
          )
          .optional(),
      }),
      finish_reason: z.string().nullable(),
      logprobs: z.any().optional(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
      prompt_tokens_details: z
        .object({
          caching_tokens: z.number().optional(),
          cached_tokens: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

const RequestyStreamChatCompletionChunkSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            content: z.string().nullable().optional(),
            reasoning: z.string().nullable().optional(),
            tool_calls: z
              .array(
                z.object({
                  index: z.number(),
                  id: z.string().optional(),
                  type: z.string().optional(),
                  function: z
                    .object({
                      name: z.string().optional(),
                      arguments: z.string().optional(),
                    })
                    .optional(),
                }),
              )
              .optional(),
          })
          .optional(),
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
      prompt_tokens_details: z
        .object({
          caching_tokens: z.number().optional(),
          cached_tokens: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  error: z.any().optional(),
});

function prepareToolsAndToolChoice({
  tools,
  toolChoice,
}: {
  tools?: Array<
    LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool
  >;
  toolChoice?: LanguageModelV2CallOptions['toolChoice'];
}) {
  // when the tools array is empty, change it to undefined to prevent errors:
  const validTools = tools?.length ? tools : undefined;

  if (validTools == null) {
    return { tools: undefined, tool_choice: undefined };
  }

  const mappedTools = validTools.map((tool) => {
    if (!isFunctionTool(tool)) {
      throw new UnsupportedFunctionalityError({
        functionality: 'Provider defined tools',
      });
    }

    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    };
  });

  if (toolChoice == null) {
    return { tools: mappedTools, tool_choice: undefined };
  }

  const type = toolChoice.type;

  switch (type) {
    case 'auto':
    case 'none':
    case 'required':
      return { tools: mappedTools, tool_choice: type };
    case 'tool':
      return {
        tools: mappedTools,
        tool_choice: {
          type: 'function',
          function: {
            name: toolChoice.toolName,
          },
        },
      };
    default: {
      const _exhaustiveCheck: never = type;
      throw new Error(`Unsupported tool choice type: ${_exhaustiveCheck}`);
    }
  }
}
