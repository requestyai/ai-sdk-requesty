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
        messages.push({
          role: 'system',
          content: message.content,
        });
        break;
      }

      case 'user': {
        let text = '';
        let images: RequestyImagePart[] = [];

        for (const part of message.content) {
          switch (part.type) {
            case 'text': {
              text += part.text;
              break;
            }

            case 'file': {
              if (part.mediaType.startsWith('image/')) {
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

                images.push({
                  type: 'image_url',
                  image_url: { url: data },
                });
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

        if (images.length > 0) {
          const content: Array<RequestyTextPart | RequestyImagePart> = [];
          if (text) {
            content.push({ type: 'text', text });
          }
          content.push(...images);

          messages.push({
            role: 'user',
            content,
          });
        } else {
          messages.push({
            role: 'user',
            content: text,
          });
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

        messages.push(assistantMessage);
        break;
      }

      case 'tool': {
        for (const part of message.content) {
          if (part.type === 'tool-result') {
            let content: string;

            if (part.output.type === 'text') {
              content = part.output.value;
            } else if (part.output.type === 'json') {
              content = JSON.stringify(part.output.value);
            } else if (part.output.type === 'error-text') {
              content = `Error: ${part.output.value}`;
            } else if (part.output.type === 'error-json') {
              content = `Error: ${JSON.stringify(part.output.value)}`;
            } else if (part.output.type === 'content') {
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
            } else {
              const _exhaustiveCheck: never = part.output;
              throw new Error(
                `Unsupported tool result output type: ${_exhaustiveCheck}`,
              );
            }

            messages.push({
              role: 'tool',
              tool_call_id: part.toolCallId,
              content,
            });
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
