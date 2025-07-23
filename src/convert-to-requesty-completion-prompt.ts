import type { LanguageModelV2Prompt } from '@ai-sdk/provider';

export function convertToRequestyCompletionPrompt(
  prompt: LanguageModelV2Prompt,
  options?: {
    botStopSequence?: string;
    userStopSequence?: string;
  },
): string {
  const { botStopSequence = '</s>', userStopSequence = '' } = options ?? {};

  return prompt
    .map(({ role, content }) => {
      if (role === 'system') {
        return content;
      }

      if (role === 'user') {
        const text = content
          .map((part) => {
            switch (part.type) {
              case 'text':
                return part.text;
              case 'file':
                if (part.data instanceof URL) {
                  return part.data.toString();
                } else if (part.data instanceof Uint8Array) {
                  return '[Binary file]';
                } else {
                  return part.data;
                }
              default: {
                const _exhaustiveCheck: never = part;
                throw new Error(
                  `Unsupported user content part: ${_exhaustiveCheck}`,
                );
              }
            }
          })
          .join('');

        return text + userStopSequence;
      }

      if (role === 'assistant') {
        const text = content
          .map((part) => {
            switch (part.type) {
              case 'text':
                return part.text;
              case 'reasoning':
                return part.text;
              case 'tool-call':
                return `Function call: ${part.toolName}(${JSON.stringify(part.input)})`;
              case 'file':
                return '[File]';
              case 'tool-result':
                return `Function result: ${JSON.stringify(part.output)}`;
              default: {
                const _exhaustiveCheck: never = part;
                throw new Error(
                  `Unsupported assistant content part: ${_exhaustiveCheck}`,
                );
              }
            }
          })
          .join('');

        return text + botStopSequence;
      }

      if (role === 'tool') {
        const text = content
          .map((part) => {
            if (part.type === 'tool-result') {
              if (part.output.type === 'text') {
                return part.output.value;
              } else if (part.output.type === 'json') {
                return JSON.stringify(part.output.value);
              } else if (part.output.type === 'error-text') {
                return `Error: ${part.output.value}`;
              } else if (part.output.type === 'error-json') {
                return `Error: ${JSON.stringify(part.output.value)}`;
              } else if (part.output.type === 'content') {
                return part.output.value
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
                  `Unsupported tool result output: ${_exhaustiveCheck}`,
                );
              }
            }
            return '';
          })
          .join('');

        return text;
      }

      const _exhaustiveCheck: never = role;
      throw new Error(`Unsupported message role: ${_exhaustiveCheck}`);
    })
    .join('');
}
