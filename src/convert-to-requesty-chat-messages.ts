import type {
  LanguageModelV2Prompt,
  SharedV2ProviderMetadata,
} from '@ai-sdk/provider';
import type {
  ChatCompletionContentPart,
  RequestyChatPrompt,
} from './requesty-chat-prompt';

import { convertUint8ArrayToBase64 } from '@ai-sdk/provider-utils';

// Type for Requesty Cache Control following Anthropic's pattern
export type RequestyCacheControl = { type: 'ephemeral' };

function getCacheControl(
  providerMetadata: SharedV2ProviderMetadata | undefined,
): RequestyCacheControl | undefined {
  const anthropic = providerMetadata?.anthropic;
  const requesty = providerMetadata?.requesty;

  // Allow both cacheControl and cache_control:
  return (requesty?.cacheControl ??
    requesty?.cache_control ??
    anthropic?.cacheControl ??
    anthropic?.cache_control) as RequestyCacheControl | undefined;
}

export function convertToRequestyChatMessages(
  prompt: LanguageModelV2Prompt,
): RequestyChatPrompt {
  const messages: RequestyChatPrompt = [];

  for (const { role, content, providerMetadata } of prompt) {
    switch (role) {
      case 'system': {
        messages.push({
          role: 'system',
          content,
          cache_control: getCacheControl(providerMetadata),
        });
        break;
      }

      case 'user': {
        if (content.length === 1 && content[0]?.type === 'text') {
          messages.push({
            role: 'user',
            content: content[0].text,
            cache_control:
              getCacheControl(providerMetadata) ??
              getCacheControl(content[0].providerMetadata),
          });
          break;
        }

        // Get message level cache control
        const messageCacheControl = getCacheControl(providerMetadata);
        const contentParts: ChatCompletionContentPart[] = content.map(
          (part) => {
            switch (part.type) {
              case 'text':
                return {
                  type: 'text' as const,
                  text: part.text,
                  // For text parts, only use part-specific cache control
                  cache_control:
                    getCacheControl(part.providerMetadata) ??
                    messageCacheControl,
                };
              case 'image':
                return {
                  type: 'image_url' as const,
                  image_url: {
                    url:
                      part.image instanceof URL
                        ? part.image.toString()
                        : `data:${part.mimeType ?? 'image/jpeg'};base64,${convertUint8ArrayToBase64(
                            part.image,
                          )}`,
                  },
                  // For image parts, use part-specific or message-level cache control
                  cache_control:
                    getCacheControl(part.providerMetadata) ??
                    messageCacheControl,
                };
              case 'file':
                return {
                  type: 'text' as const,
                  text:
                    part.data instanceof URL ? part.data.toString() : part.data,
                  cache_control:
                    getCacheControl(part.providerMetadata) ??
                    messageCacheControl,
                };
              default: {
                const _exhaustiveCheck: never = part;
                throw new Error(
                  `Unsupported content part type: ${_exhaustiveCheck}`,
                );
              }
            }
          },
        );

        // For multi-part messages, don't add cache_control at the root level
        messages.push({
          role: 'user',
          content: contentParts,
        });

        break;
      }

      case 'assistant': {
        let text = '';
        const toolCalls: Array<{
          id: string;
          type: 'function';
          function: { name: string; arguments: string };
        }> = [];

        for (const part of content) {
          switch (part.type) {
            case 'text': {
              text += part.text;
              break;
            }
            case 'tool-call': {
              toolCalls.push({
                id: part.toolCallId,
                type: 'function',
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.args),
                },
              });
              break;
            }
            // TODO: Handle reasoning and redacted-reasoning
            case 'reasoning':
            case 'redacted-reasoning':
              break;
            default: {
              const _exhaustiveCheck: never = part;
              throw new Error(`Unsupported part: ${_exhaustiveCheck}`);
            }
          }
        }

        messages.push({
          role: 'assistant',
          content: !text && toolCalls.length > 0 ? undefined : text,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          cache_control: getCacheControl(providerMetadata),
        });

        break;
      }

      case 'tool': {
        for (const toolResponse of content) {
          messages.push({
            role: 'tool',
            tool_call_id: toolResponse.toolCallId,
            content: JSON.stringify(toolResponse.result),
            cache_control:
              getCacheControl(providerMetadata) ??
              getCacheControl(toolResponse.providerMetadata),
          });
        }
        break;
      }

      default: {
        const _exhaustiveCheck: never = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }

  return messages;
}
