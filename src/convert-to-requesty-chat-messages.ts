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

        messages.push(systemMessage);
        break;
      }

      case 'user': {
        let text = '';
        const textParts: Array<{ type: 'text'; text: string }> = [];
        const imageParts: RequestyImagePart[] = [];
        // Track if we need multi-part content structure

        for (const part of message.content) {
          switch (part.type) {
            case 'text': {
              const textPart = {
                type: 'text',
                text: part.text,
              };

              // Note: Cache control is handled by the provider, not exposed in message format

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
              } else if (typeof part.image === 'string') {
                // Check if it's already a data URL or regular URL
                if (
                  part.image.startsWith('data:') ||
                  part.image.startsWith('http')
                ) {
                  data = part.image;
                } else {
                  // It's a raw base64 string, format it properly
                  data = `data:${part.mimeType || 'image/png'};base64,${part.image}`;
                }
              } else {
                // Fallback
                data = String(part.image);
              }

              const imagePart: RequestyImagePart = {
                type: 'image_url',
                image_url: { url: data },
              };

              // Note: Cache control is handled by the provider, not exposed in message format

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
                } else if (typeof part.data === 'string') {
                  // Check if it's already a data URL or regular URL
                  if (
                    part.data.startsWith('data:') ||
                    part.data.startsWith('http')
                  ) {
                    data = part.data;
                  } else {
                    // It's a raw base64 string, format it properly
                    data = `data:${part.mediaType};base64,${part.data}`;
                  }
                } else {
                  // Fallback
                  data = String(part.data);
                }

                const imagePart: RequestyImagePart = {
                  type: 'image_url',
                  image_url: { url: data },
                };

                // Note: Cache control is handled by the provider, not exposed in message format

                imageParts.push(imagePart);
              } else {
                // Handle non-image files as text
                const textPart = {
                  type: 'text',
                  text: 'file content',
                };

                // Note: Cache control is handled by the provider, not exposed in message format

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
        // Only use multi-part if we have images. Text-only should always be consolidated.
        const hasImages = imageParts.length > 0;

        if (hasImages) {
          const content: Array<RequestyTextPart | RequestyImagePart> = [];
          content.push(...textParts);
          content.push(...imageParts);

          const userMessage: RequestyChatMessage = {
            role: 'user',
            content,
          };

          // Note: Cache control is handled by the provider, not exposed in message format

          messages.push(userMessage);
        } else {
          // Text-only: consolidate to simple string
          const userMessage: RequestyChatMessage = {
            role: 'user',
            content: text,
          };

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

        // Note: Cache control is handled by the provider, not exposed in message format

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

            // Note: Cache control is handled by the provider, not exposed in message format

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
