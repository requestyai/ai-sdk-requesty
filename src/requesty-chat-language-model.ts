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
    SharedV2ProviderOptions,
} from '@ai-sdk/provider'
import { UnsupportedFunctionalityError } from '@ai-sdk/provider'
import type { ParseResult } from '@ai-sdk/provider-utils'
import {
    combineHeaders,
    createEventSourceResponseHandler,
    createJsonResponseHandler,
    generateId,
    postJsonToApi,
} from '@ai-sdk/provider-utils'
import { z } from 'zod'
import { mapRequestyFinishReason } from './map-requesty-finish-reason'
import { convertToRequestyChatMessages } from './messages'
import type {
    RequestyChatModelId,
    RequestyChatSettings,
} from './requesty-chat-settings'
import { requestyFailedResponseHandler } from './requesty-error'
import { createStreamMethods } from './stream'
import { maybeSetReasoningContent } from './util'

type RequestyChatConfig = {
    provider: string
    compatibility: 'strict' | 'compatible'
    headers: () => Record<string, string | undefined>
    url: (options: { modelId: string; path: string }) => string
    fetch?: typeof fetch
    extraBody?: Record<string, unknown>
    supportedUrls?: Record<string, RegExp[]>
}

const URL_REGEX = /^https?:\/\/.*$/

export class RequestyChatLanguageModel implements LanguageModelV2 {
    readonly specificationVersion = 'v2'
    readonly provider: string
    readonly modelId: RequestyChatModelId

    readonly supportedUrls: Record<string, RegExp[]> = {
        'image/*': [URL_REGEX, /^data:image\/.+;base64,/],
        'application/*': [URL_REGEX, /^data:application\//],
    }

    readonly settings: RequestyChatSettings
    private readonly config: RequestyChatConfig

    constructor(
        modelId: RequestyChatModelId,
        settings: RequestyChatSettings,
        config: RequestyChatConfig,
    ) {
        this.modelId = modelId
        this.settings = settings
        this.config = config
        this.provider = config.provider

        if (config.supportedUrls) {
            this.supportedUrls = config.supportedUrls
        }
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
        // Extract requesty metadata from providerOptions and put it at root level
        const requestyMetadata = providerOptions?.['requesty'] ?? {}
        const extraCallingBody: Record<string, any> = {}

        // If there's requesty metadata, add it as a root-level 'requesty' field
        if (Object.keys(requestyMetadata).length > 0) {
            extraCallingBody.requesty = requestyMetadata
        }

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
        }

        // Handle tools and tool choice
        if (tools && tools.length > 0) {
            const { tools: mappedTools, tool_choice } =
                prepareToolsAndToolChoice({
                    tools,
                    toolChoice,
                })
            return { ...baseArgs, tools: mappedTools, tool_choice }
        }

        // Handle response format for object generation
        if (responseFormat?.type === 'json') {
            return {
                ...baseArgs,
                response_format: { type: 'json_object' },
            }
        }

        return baseArgs
    }

    async doGenerate(options: LanguageModelV2CallOptions): Promise<{
        content: Array<LanguageModelV2Content>
        finishReason: LanguageModelV2FinishReason
        usage: LanguageModelV2Usage
        providerMetadata?: SharedV2ProviderMetadata
        request?: {
            body?: unknown
        }
        response?: LanguageModelV2ResponseMetadata & {
            headers?: SharedV2Headers
            body?: unknown
        }
        warnings: Array<LanguageModelV2CallWarning>
        providerOptions?: SharedV2ProviderOptions
    }> {
        const args = this.getArgs(options)

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
        })

        const rawSettings = args
        const choice = response.choices[0]

        if (!choice) {
            throw new Error('No choice in response')
        }

        const providerMetadata = response.usage?.prompt_tokens_details
            ? ({
                  requesty: {
                      usage: {
                          cachingTokens:
                              response.usage.prompt_tokens_details
                                  .caching_tokens ?? 0,
                          cachedTokens:
                              response.usage.prompt_tokens_details
                                  .cached_tokens ?? 0,
                      },
                  },
              } satisfies SharedV2ProviderMetadata)
            : undefined

        // Convert to content format
        const content: Array<LanguageModelV2Content> = []

        // Add text content
        if (choice.message.content) {
            content.push({
                type: 'text',
                text: choice.message.content,
            })
        }

        // Add reasoning content if present
        if (choice.message.reasoning) {
            content.push({
                type: 'reasoning',
                text: choice.message.reasoning,
            })
        }

        // Add tool calls
        if (choice.message.tool_calls) {
            for (const toolCall of choice.message.tool_calls) {
                const toolCallContent: LanguageModelV2Content = {
                    type: 'tool-call',
                    toolCallId: toolCall.id ?? generateId(),
                    toolName: toolCall.function.name,
                    input: toolCall.function.arguments as any, // AI SDK expects unknown/any for tool input
                }

                maybeSetReasoningContent(
                    toolCallContent,
                    choice.message.reasoning_signature,
                )

                content.push(toolCallContent)
            }
        }

        const res: Awaited<
            ReturnType<RequestyChatLanguageModel['doGenerate']>
        > = {
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
        }

        return res
    }

    async doStream(options: LanguageModelV2CallOptions): Promise<{
        stream: ReadableStream<LanguageModelV2StreamPart>
        request?: {
            body?: unknown
        }
        response?: {
            headers?: SharedV2Headers
        }
    }> {
        const args = this.getArgs(options)

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
        })

        const rawSettings = args

        const { transform, flush } = createStreamMethods()

        return {
            stream: response.pipeThrough(
                new TransformStream<
                    ParseResult<
                        z.infer<typeof RequestyStreamChatCompletionChunkSchema>
                    >,
                    LanguageModelV2StreamPart
                >({
                    transform,
                    flush,
                }),
            ),
            request: { body: rawSettings },
            response: { headers: responseHeaders },
        }
    }
}

const RequestyNonStreamChatCompletionResponseSchema = z.object({
    id: z.string().optional(),
    model: z.string().optional(),
    choices: z.array(
        z.object({
            message: z.object({
                role: z.string(),
                content: z.string().nullable().optional(),
                reasoning: z.string().optional(),
                reasoning_signature: z.string().optional(),
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
})

export const RequestyStreamChatCompletionToolSchema = z
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
    .optional()

export const RequestyStreamChatCompletionChunkSchema = z.object({
    id: z.string().optional(),
    model: z.string().optional(),
    choices: z
        .array(
            z.object({
                delta: z
                    .object({
                        content: z.string().nullable().optional(),
                        reasoning_signature: z.string().nullable().optional(),
                        reasoning: z.string().nullable().optional(),
                        tool_calls: RequestyStreamChatCompletionToolSchema,
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
})

function prepareToolsAndToolChoice({
    tools,
    toolChoice,
}: {
    tools?: Array<
        LanguageModelV2FunctionTool | LanguageModelV2ProviderDefinedTool
    >
    toolChoice?: LanguageModelV2CallOptions['toolChoice']
}) {
    // when the tools array is empty, change it to undefined to prevent errors:
    const validTools = tools?.length ? tools : undefined

    if (validTools == null) {
        return { tools: undefined, tool_choice: undefined }
    }

    const mappedTools = validTools.map((tool) => {
        if (tool.type !== 'function') {
            throw new UnsupportedFunctionalityError({
                functionality: `${tool.type} tools`,
            })
        }

        return {
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
            },
        }
    })

    if (toolChoice == null) {
        return { tools: mappedTools, tool_choice: undefined }
    }

    const type = toolChoice.type

    switch (type) {
        case 'auto':
        case 'none':
        case 'required':
            return { tools: mappedTools, tool_choice: type }
        case 'tool':
            return {
                tools: mappedTools,
                tool_choice: {
                    type: 'function',
                    function: {
                        name: toolChoice.toolName,
                    },
                },
            }
        default: {
            const _exhaustiveCheck: never = type
            throw new Error(`Unsupported tool choice type: ${_exhaustiveCheck}`)
        }
    }
}
