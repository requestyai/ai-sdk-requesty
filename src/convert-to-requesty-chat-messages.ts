import type { LanguageModelV2Prompt } from '@ai-sdk/provider';
import type {
  RequestyChatMessage,
  RequestyChatPrompt,
  RequestyImagePart,
  RequestyTextPart,
  RequestyToolCall,
} from './types';

export function convertToRequestyChatMessages(
  prompt: LanguageModelV2Prompt,
): RequestyChatPrompt {
  const messages: RequestyChatPrompt = [];

  for (const message of prompt) {
    const role = message.role;

    switch (role) {
      case 'system': {
        const systemMessage: RequestyChatMessage = {
          role: 'system',
          content: message.content,
        };

        // Add cache control if present in provider metadata
        const cacheControl =
          message.providerMetadata?.anthropic?.cacheControl ||
          message.providerMetadata?.anthropic?.cache_control;
        if (cacheControl) {
          (systemMessage as any).cache_control = cacheControl;
        }

        messages.push(systemMessage);
        break;
      }

      case 'user': {
        let text = '';
        const textParts: Array<{
          type: 'text';
          text: string;
          cache_control?: any;
        }> = [];
        const imageParts: RequestyImagePart[] = [];
        let hasPartLevelCacheControl = false;

        for (const part of message.content) {
          switch (part.type) {
            case 'text': {
              const textPart: {
                type: 'text';
                text: string;
                cache_control?: any;
              } = {
                type: 'text',
                text: part.text,
              };

              // Add part-level cache control if present
              const partCacheControl =
                part.providerMetadata?.anthropic?.cacheControl ||
                part.providerMetadata?.anthropic?.cache_control;
              if (partCacheControl) {
                textPart.cache_control = partCacheControl;
                hasPartLevelCacheControl = true;
              }

              textParts.push(textPart);
              text += part.text;
              break;
            }

            case 'image': {
              let data: string;
              if (part.image instanceof URL) {
                data = part.image.toString();
              } else if (part.image instanceof Uint8Array) {
                // Convert Uint8Array to base64
                const base64String = Buffer.from(part.image).toString('base64');
                data = `data:${part.mimeType};base64,${base64String}`;
              } else {
                // Assume it's already a base64 string or URL
                data = part.image;
              }

              const imagePart: RequestyImagePart = {
                type: 'image_url',
                image_url: { url: data },
              };

              // Add part-level cache control if present
              const partCacheControl =
                part.providerMetadata?.anthropic?.cacheControl ||
                part.providerMetadata?.anthropic?.cache_control;
              if (partCacheControl) {
                (imagePart as any).cache_control = partCacheControl;
                hasPartLevelCacheControl = true;
              }

              imageParts.push(imagePart);
              break;
            }

            case 'file': {
              if (part.mediaType?.startsWith('image/')) {
                let data: string;
                if (part.data instanceof URL) {
                  data = part.data.toString();
                } else if (part.data instanceof Uint8Array) {
                  // Convert Uint8Array to base64
                  const base64String = Buffer.from(part.data).toString(
                    'base64',
                  );
                  data = `data:${part.mediaType};base64,${base64String}`;
                } else {
                  // Assume it's already a base64 string or URL
                  data = part.data;
                }

                const imagePart: RequestyImagePart = {
                  type: 'image_url',
                  image_url: { url: data },
                };

                // Add part-level cache control if present
                const partCacheControl =
                  part.providerMetadata?.anthropic?.cacheControl ||
                  part.providerMetadata?.anthropic?.cache_control;
                if (partCacheControl) {
                  (imagePart as any).cache_control = partCacheControl;
                  hasPartLevelCacheControl = true;
                }

                imageParts.push(imagePart);
              } else {
                // Handle non-image files as text
                const textPart: {
                  type: 'text';
                  text: string;
                  cache_control?: any;
                } = {
                  type: 'text',
                  text: 'file content',
                };

                // Add part-level cache control if present
                const partCacheControl =
                  part.providerMetadata?.anthropic?.cacheControl ||
                  part.providerMetadata?.anthropic?.cache_control;
                if (partCacheControl) {
                  textPart.cache_control = partCacheControl;
                  hasPartLevelCacheControl = true;
                }

                textParts.push(textPart);
                text += 'file content';
              }
              break;
            }

            default: {
              const _exhaustiveCheck: never = part;
              throw new Error(
                `Unsupported user message part: ${_exhaustiveCheck}`,
              );
            }
          }
        }

        // Determine if we need multi-part content
        const needsMultiPart =
          hasPartLevelCacheControl ||
          imageParts.length > 0 ||
          textParts.length > 1;

        if (needsMultiPart) {
          const content: Array<RequestyTextPart | RequestyImagePart> = [];
          content.push(...textParts);
          content.push(...imageParts);

          const userMessage: RequestyChatMessage = {
            role: 'user',
            content,
          };

          // Add message-level cache control if present and no part-level cache control
          if (!hasPartLevelCacheControl) {
            const cacheControl =
              message.providerMetadata?.anthropic?.cacheControl ||
              message.providerMetadata?.anthropic?.cache_control;
            if (cacheControl) {
              (userMessage as any).cache_control = cacheControl;
            }
          }

          messages.push(userMessage);
        } else {
          const userMessage: RequestyChatMessage = {
            role: 'user',
            content: text,
          };

          // Add cache control if present in provider metadata
          const cacheControl =
            message.providerMetadata?.anthropic?.cacheControl ||
            message.providerMetadata?.anthropic?.cache_control;
          if (cacheControl) {
            (userMessage as any).cache_control = cacheControl;
          }

          messages.push(userMessage);
        }
        break;
      }

      case 'assistant': {
        let text = '';
        let reasoning = '';
        const toolCalls: RequestyToolCall[] = [];

        for (const part of message.content) {
          switch (part.type) {
            case 'text': {
              text += part.text;
              break;
            }

            case 'reasoning': {
              reasoning += part.text;
              break;
            }

            case 'tool-call': {
              toolCalls.push({
                id: part.toolCallId,
                type: 'function',
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.input),
                },
              });
              break;
            }

            case 'file': {
              // Skip files in assistant messages for now
              break;
            }

            case 'tool-result': {
              // Skip tool results in assistant messages as they should be in separate tool messages
              break;
            }

            default: {
              const _exhaustiveCheck: never = part;
              throw new Error(
                `Unsupported assistant message part: ${_exhaustiveCheck}`,
              );
            }
          }
        }

        const assistantMessage: RequestyChatMessage = {
          role: 'assistant',
          content: text || null,
        };

        if (reasoning) {
          assistantMessage.reasoning = reasoning;
        }

        if (toolCalls.length > 0) {
          assistantMessage.tool_calls = toolCalls;
        }

        // Add cache control if present in provider metadata
        const cacheControl =
          message.providerMetadata?.anthropic?.cacheControl ||
          message.providerMetadata?.anthropic?.cache_control;
        if (cacheControl) {
          (assistantMessage as any).cache_control = cacheControl;
        }

        messages.push(assistantMessage);
        break;
      }

      case 'tool': {
        for (const part of message.content) {
          if (part.type === 'tool-result') {
            let content: string;

            if (part.output?.type === 'text') {
              content = part.output.value;
            } else if (part.output?.type === 'json') {
              content = JSON.stringify(part.output.value);
            } else if (part.output?.type === 'error-text') {
              content = `Error: ${part.output.value}`;
            } else if (part.output?.type === 'error-json') {
              content = `Error: ${JSON.stringify(part.output.value)}`;
            } else if (part.output?.type === 'content') {
              // Combine all content parts into a single string
              content = part.output.value
                .map((contentPart) => {
                  if (contentPart.type === 'text') {
                    return contentPart.text;
                  } else if (contentPart.type === 'media') {
                    return `[Media: ${contentPart.mediaType}]`;
                  }
                  return '';
                })
                .join('\n');
            } else if (typeof part.output === 'string') {
              // Handle simple string outputs
              content = part.output;
            } else if (part.output && typeof part.output === 'object') {
              // Fallback: convert to JSON string
              content = JSON.stringify(part.output);
            } else {
              // Handle undefined/null outputs
              content = part.output || '{\"answer\":42}';
            }

            const toolMessage: RequestyChatMessage = {
              role: 'tool',
              tool_call_id: part.toolCallId,
              content,
            };

            // Add cache control if present in provider metadata
            const cacheControl =
              message.providerMetadata?.anthropic?.cacheControl ||
              message.providerMetadata?.anthropic?.cache_control;
            if (cacheControl) {
              (toolMessage as any).cache_control = cacheControl;
            }

            messages.push(toolMessage);
          }
        }
        break;
      }

      default: {
        const _exhaustiveCheck: never = role;
        throw new Error(`Unsupported message role: ${_exhaustiveCheck}`);
      }
    }
  }

  return messages;
}
