import { convertToRequestyChatMessages } from './convert-to-requesty-chat-messages';

describe('user messages', () => {
  it('should convert messages with image parts to multiple parts', async () => {
    const result = convertToRequestyChatMessages([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello' },
          {
            type: 'image',
            image: new Uint8Array([0, 1, 2, 3]),
            mimeType: 'image/png',
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello' },
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,AAECAw==' },
          },
        ],
      },
    ]);
  });

  it('should convert messages with only a text part to a string content', async () => {
    const result = convertToRequestyChatMessages([
      {
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      },
    ]);

    expect(result).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('should handle multiple text parts', async () => {
    const result = convertToRequestyChatMessages([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello ' },
          { type: 'text', text: 'world' },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        role: 'user',
        content: 'Hello world',
      },
    ]);
  });

  it('should handle file parts that are not images', async () => {
    const result = convertToRequestyChatMessages([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello' },
          {
            type: 'file',
            data: new Uint8Array([0, 1, 2, 3]),
            mediaType: 'application/pdf',
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        role: 'user',
        content: 'Hellofile content',
      },
    ]);
  });
});

describe('system messages', () => {
  it('should convert system messages', () => {
    const result = convertToRequestyChatMessages([
      {
        role: 'system',
        content: 'System prompt',
      },
    ]);

    expect(result).toEqual([
      {
        role: 'system',
        content: 'System prompt',
      },
    ]);
  });
});

describe('assistant messages', () => {
  it('should convert assistant messages with text', () => {
    const result = convertToRequestyChatMessages([
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'Assistant response' }],
      },
    ]);

    expect(result).toEqual([
      {
        role: 'assistant',
        content: 'Assistant response',
      },
    ]);
  });

  it('should convert assistant messages with tool calls', () => {
    const result = convertToRequestyChatMessages([
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: '12345',
            toolName: 'get-weather',
            input: { location: 'Paris' },
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: '12345',
            type: 'function',
            function: {
              name: 'get-weather',
              arguments: JSON.stringify({ location: 'Paris' }),
            },
          },
        ],
      },
    ]);
  });
});

describe('tool messages', () => {
  it('should convert tool messages with JSON output', () => {
    const result = convertToRequestyChatMessages([
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-123',
            toolName: 'get-weather',
            output: { answer: 42 },
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        role: 'tool',
        tool_call_id: 'call-123',
        content: '{"answer":42}',
      },
    ]);
  });
});
