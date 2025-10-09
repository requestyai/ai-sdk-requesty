import type {
    LanguageModelV2FinishReason,
    LanguageModelV2StreamPart,
    LanguageModelV2Usage,
    SharedV2ProviderMetadata,
} from '@ai-sdk/provider'
import {
    generateId,
    isParsableJson,
    type ParseResult,
} from '@ai-sdk/provider-utils'
import type { z } from 'zod'
import type {
    RequestyStreamChatCompletionChunkSchema,
    RequestyStreamChatCompletionToolSchema,
} from '../requesty-chat-language-model'
import type { RequestyUsage } from '../types'
import { assert, assertDefined } from '../util'

type ChunkType = z.infer<typeof RequestyStreamChatCompletionChunkSchema>
type Chunk = ParseResult<ChunkType>

type ToolCall = z.infer<typeof RequestyStreamChatCompletionToolSchema>

type DefinedToolCall = NonNullable<ToolCall>[number]

function handleUsageChunk(
    usage: NonNullable<ChunkType['usage']>,
): [LanguageModelV2Usage, Partial<RequestyUsage>] {
    const modelUsage: LanguageModelV2Usage = {
        inputTokens: usage.prompt_tokens ?? 0,
        outputTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
    }

    const requestyUsage: Partial<RequestyUsage> = {
        cachingTokens: usage.prompt_tokens_details?.caching_tokens ?? 0,
    }

    return [modelUsage, requestyUsage]
}

type CreateStreamReturn = {
    transform: (
        chunk: Chunk,
        controller: TransformStreamDefaultController<LanguageModelV2StreamPart>,
    ) => void
    flush: (
        controller: TransformStreamDefaultController<LanguageModelV2StreamPart>,
    ) => void
}

type Value<T> = {
    set: (v: T) => void
    get: () => T
}

const createValue = <T>(startingValue: T): Value<T> => {
    let value = startingValue

    return {
        get: () => value,
        set: (v) => {
            value = v
        },
    }
}

type CreateTransformMethods = {
    finishReason: Value<LanguageModelV2FinishReason>
    usage: Value<LanguageModelV2Usage>
    requestyUsage: Value<Partial<RequestyUsage>>
    activeId: Value<string | undefined>
    reasoningId: Value<string | undefined>
    existingToolCalls: Value<Array<DefinedToolCall>>
}

export const createTransform = ({
    finishReason,
    usage,
    requestyUsage,
    activeId,
    reasoningId,
    existingToolCalls,
}: CreateTransformMethods): CreateStreamReturn['transform'] => {
    return (chunk, controller) => {
        if (!chunk.success) {
            finishReason.set('error')
            controller.enqueue({
                type: 'error',
                error: chunk.error.message,
            })
            return
        }

        const { value } = chunk
        if (value.error) {
            finishReason.set('error')
            controller.enqueue({
                type: 'error',
                error: value.error,
            })
            return
        }

        if (value.id) {
            controller.enqueue({
                type: 'response-metadata',
                id: value.id,
            })
        }

        if (value.model) {
            controller.enqueue({
                type: 'response-metadata',
                modelId: value.model,
            })
        }

        if (value.usage != null) {
            const [newUsage, newRequestyUsage] = handleUsageChunk(value.usage)
            usage.set(newUsage)
            requestyUsage.set(newRequestyUsage)
        }

        const delta = value.choices?.[0]?.delta
        assertDefined(delta)

        if (delta.content) {
            let id = activeId.get()

            if (!id) {
                id = generateId()
                activeId.set(id)

                controller.enqueue({
                    type: 'text-start',
                    id,
                })
            }

            controller.enqueue({
                id,
                type: 'text-delta',
                delta: delta.content,
            })
        }

        if (delta.reasoning) {
            let id = reasoningId.get()
            if (!id) {
                id = generateId()
                activeId.set(id)

                controller.enqueue({
                    type: 'reasoning-start',
                    id,
                })
            }

            controller.enqueue({
                id,
                type: 'reasoning-delta',
                delta: delta.reasoning,
            })
        }

        if (delta.tool_calls) {
            const toolCalls = existingToolCalls.get()

            for (const toolCallDelta of delta.tool_calls) {
                assertDefined(toolCallDelta)

                const { index, function: fn, id } = toolCallDelta
                assertDefined(
                    fn,
                    'function should always be defined in tool call',
                )

                let currentToolCall = toolCalls[index]

                if (!currentToolCall) {
                    assertDefined(id, 'new tool should have an id')
                    assertDefined(
                        fn.name,
                        'new tool call should have a defined name',
                    )

                    assert(
                        toolCallDelta.type === 'function',
                        "Expected 'function' type",
                    )

                    currentToolCall = {
                        id,
                        index,
                        function: {
                            // NOTE: don't add the arguments, because we handle that later.
                            name: fn.name,
                        },
                        type: 'function',
                    }

                    controller.enqueue({
                        type: 'tool-input-start',
                        id,
                        toolName: fn.name,
                    })

                    if (!fn.arguments) {
                        continue
                    }
                }

                assertDefined(
                    fn.arguments,
                    'existing tool call must have arguments',
                )

                assertDefined(currentToolCall.id, 'unreachable')
                assertDefined(currentToolCall.function, 'unreachable')
                assertDefined(currentToolCall.function.name)

                if (!currentToolCall.function.arguments) {
                    currentToolCall.function.arguments = ''
                }

                currentToolCall.function.arguments += fn.arguments

                controller.enqueue({
                    type: 'tool-input-delta',
                    id: currentToolCall.id,
                    delta: fn.arguments,
                })

                toolCalls[index] = currentToolCall
                existingToolCalls.set(toolCalls)

                assertDefined(currentToolCall.function.arguments)

                const isCompleteToolCall = isParsableJson(
                    currentToolCall.function.arguments,
                )
                if (!isCompleteToolCall) {
                    continue
                }

                controller.enqueue({
                    type: 'tool-input-end',
                    id: currentToolCall.id,
                })

                controller.enqueue({
                    type: 'tool-call',
                    toolCallId: currentToolCall.id,
                    input: currentToolCall.function.arguments,
                    toolName: currentToolCall.function.name,
                })
            }
        }
    }
}

export const createFlush = ({
    requestyUsage,
    finishReason,
    usage,
    activeId,
    reasoningId,
}: CreateTransformMethods): CreateStreamReturn['flush'] => {
    return (controller) => {
        const currentActiveId = activeId.get()
        if (currentActiveId) {
            controller.enqueue({
                type: 'text-end',
                id: currentActiveId,
            })

            activeId.set(undefined)
        }

        const currentReasoningId = reasoningId.get()
        if (currentReasoningId) {
            controller.enqueue({
                type: 'reasoning-end',
                id: currentReasoningId,
            })

            reasoningId.set(undefined)
        }

        const currentRequestyUsage = requestyUsage.get()
        const providerMetadata: SharedV2ProviderMetadata = {
            requesty: {
                usage:
                    currentRequestyUsage.cachedTokens &&
                    currentRequestyUsage.cachingTokens
                        ? currentRequestyUsage
                        : {},
            },
        }

        const hasProviderMetadata = providerMetadata.requesty?.usage

        const currentFinishReason = finishReason.get()
        const currentUsage = usage.get()
        controller.enqueue({
            type: 'finish',
            finishReason: currentFinishReason,
            usage: currentUsage,
            ...(hasProviderMetadata ? { providerMetadata } : {}),
        })
    }
}

export const createStreamMethods = (): CreateStreamReturn => {
    const activeId = createValue<string | undefined>(undefined)
    const reasoningId = createValue<string | undefined>(undefined)
    const finishReason = createValue<LanguageModelV2FinishReason>('other')
    const usage = createValue<LanguageModelV2Usage>({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
    })
    const requestyUsage = createValue<Partial<RequestyUsage>>({})
    const existingToolCalls = createValue<DefinedToolCall[]>([])

    const methods: CreateTransformMethods = {
        activeId,
        reasoningId,
        finishReason,
        usage,
        existingToolCalls,
        requestyUsage,
    }

    return {
        transform: createTransform(methods),
        flush: createFlush(methods),
    }
}
