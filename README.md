# Requesty Provider for AI SDK v5

The [Requesty](https://requesty.ai/) provider for the [AI SDK v5](https://sdk.vercel.ai/docs) gives access to over 300 large language models through the Requesty chat and completion APIs.

## 🚀 AI SDK v5 Support

This is the **AI SDK v5 compatible** version of the Requesty provider. For AI SDK v4, use the stable version:

```bash
# AI SDK v5 (Beta)
npm install @requesty/ai-sdk@beta

# AI SDK v4 (Stable)
npm install @requesty/ai-sdk@latest
```

## Installation

```bash
# For pnpm
pnpm add @requesty/ai-sdk@beta ai@beta

# For npm
npm install @requesty/ai-sdk@beta ai@beta

# For yarn
yarn add @requesty/ai-sdk@beta ai@beta
```

## API Key Setup

For security, you should set your API key as an environment variable named exactly `REQUESTY_API_KEY`:

```bash
# Linux/Mac
export REQUESTY_API_KEY=your_api_key_here

# Windows Command Prompt
set REQUESTY_API_KEY=your_api_key_here

# Windows PowerShell
$env:REQUESTY_API_KEY="your_api_key_here"
```

## Provider Instance

You can import the default provider instance `requesty` from `@requesty/ai-sdk`:

```ts
import { requesty } from '@requesty/ai-sdk';
```

## Basic Example

```ts
import { requesty } from '@requesty/ai-sdk';
import { generateText } from 'ai';

const { text } = await generateText({
  model: requesty.chat('openai/gpt-4o'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

## AI SDK v5 Features

### Text Generation

```ts
import { generateText } from 'ai';
import { requesty } from '@requesty/ai-sdk';

// Non-streaming
const { text } = await generateText({
  model: requesty.chat('openai/gpt-4o'),
  prompt: 'Explain quantum computing',
  maxOutputTokens: 500,
});

// Streaming
import { streamText } from 'ai';

const { textStream } = streamText({
  model: requesty.chat('anthropic/claude-3.5-sonnet'),
  prompt: 'Write a story about AI',
});

for await (const delta of textStream) {
  process.stdout.write(delta);
}
```

### Tool Calling (Function Calling)

```ts
import { generateText, tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: 'Get weather information',
  inputSchema: z.object({
    location: z.string().describe('The city and country'),
    unit: z.enum(['celsius', 'fahrenheit']),
  }),
  execute: async ({ location, unit }) => {
    // Your weather API call here
    return `Weather in ${location}: 22°${unit === 'celsius' ? 'C' : 'F'}`;
  },
});

const { text } = await generateText({
  model: requesty.chat('openai/gpt-4o'),
  prompt: 'What is the weather like in Paris?',
  tools: {
    getWeather: weatherTool,
  },
});
```

### Object Generation

```ts
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: requesty.chat('openai/gpt-4o'),
  schema: z.object({
    name: z.string(),
    age: z.number(),
    hobbies: z.array(z.string()),
  }),
  prompt: 'Generate a person profile. Return as JSON.',
});

console.log(object); // { name: "John", age: 30, hobbies: ["reading", "hiking"] }
```

### Streaming with Tools

```ts
import { streamText } from 'ai';

const { textStream } = streamText({
  model: requesty.chat('anthropic/claude-3.5-sonnet'),
  prompt: 'Get the weather and suggest clothing',
  tools: {
    getWeather: weatherTool,
  },
});

for await (const delta of textStream) {
  process.stdout.write(delta);
}
```

## Requesty Metadata & Analytics

Track your API usage with custom metadata for powerful analytics in your Requesty dashboard:

```ts
import { generateText } from 'ai';

const { text } = await generateText({
  model: requesty.chat('openai/gpt-4o'),
  prompt: 'Help with customer support',
  providerOptions: {
    requesty: {
      tags: ['customer-support', 'billing'],
      user_id: 'user_12345',
      trace_id: 'support_session_789',
      extra: {
        department: 'customer_success',
        priority: 'high',
        country: 'usa',
      },
    },
  },
});
```

### Metadata Fields

- **`tags`**: Array of strings for categorizing requests
- **`user_id`**: Track requests by user
- **`trace_id`**: Connect related requests in workflows
- **`extra`**: Custom business context (any key-value pairs)

## Provider Configuration

### Basic Configuration

```ts
import { createRequesty } from '@requesty/ai-sdk';

const requesty = createRequesty({
  apiKey: process.env.REQUESTY_API_KEY, // optional if env var is set
  baseURL: 'https://router.requesty.ai/v1', // optional
});
```

### With Global Metadata

```ts
const requesty = createRequesty({
  apiKey: process.env.REQUESTY_API_KEY,
  extraBody: {
    requesty: {
      tags: ['my-app'],
      extra: {
        environment: 'production',
        version: '1.0.0',
      },
    },
  },
});
```

## Reasoning Models

Enable reasoning tokens for models that support it (like OpenAI o1, Anthropic, DeepSeek):

```ts
const { text, reasoning } = await generateText({
  model: requesty.chat('openai/o1-preview', {
    reasoningEffort: 'medium', // 'low' | 'medium' | 'high' | 'max'
  }),
  prompt: 'Solve this complex math problem step by step...',
});

console.log('Response:', text);
console.log('Reasoning:', reasoning); // Step-by-step thinking
```

### Reasoning Effort Levels

- **`'low'`** - Minimal reasoning effort
- **`'medium'`** - Moderate reasoning effort
- **`'high'`** - High reasoning effort
- **`'max'`** - Maximum reasoning effort (Requesty-specific)
- **Budget strings** (e.g., `"10000"`) - Specific token budget

## Supported Models

Access 300+ models from top providers:

- **OpenAI**: `openai/gpt-4o`, `openai/gpt-4o-mini`, `openai/o1-preview`
- **Anthropic**: `anthropic/claude-3.5-sonnet`, `anthropic/claude-3.5-haiku`
- **Google**: `google/gemini-2.0-flash-exp`, `google/gemini-1.5-pro`
- **Meta**: `meta-llama/llama-3.3-70b-instruct`
- **DeepSeek**: `deepseek/deepseek-chat`, `deepseek/deepseek-reasoner`
- **And many more...**

See the [full model list](https://www.requesty.ai/solution/llm-routing/models) on Requesty.

## Advanced Usage

### Model-Level Configuration

```ts
const model = requesty.chat('openai/gpt-4o', {
  reasoningEffort: 'high',
  extraBody: {
    requesty: {
      tags: ['premium-tier'],
    },
  },
});
```

### Multi-Step Tool Calls

```ts
import { generateText, stepCountIs } from 'ai';

const { text, steps } = await generateText({
  model: requesty.chat('openai/gpt-4o'),
  prompt: 'Research and summarize the latest AI developments',
  tools: {
    webSearch: searchTool,
    summarize: summarizeTool,
  },
  stopWhen: stepCountIs(5), // Allow up to 5 tool call steps
});

console.log('Final result:', text);
console.log('Steps taken:', steps.length);
```

### Type-Safe Tool Results

```ts
import { ToolCallUnion, ToolResultUnion } from 'ai';

const myTools = {
  getWeather: weatherTool,
  getNews: newsTool,
};

type MyToolCall = ToolCallUnion<typeof myTools>;
type MyToolResult = ToolResultUnion<typeof myTools>;

// Use these types for type-safe tool handling
```

## Compatibility

- **AI SDK v5**: Full support with all new features
- **AI SDK v4**: Use `@requesty/ai-sdk@latest` for stable compatibility
- **Node.js**: 18+ required
- **TypeScript**: Full type safety included

## Migration from AI SDK v4

If you're upgrading from AI SDK v4:

1. **Install beta versions**:
   ```bash
   npm install @requesty/ai-sdk@beta ai@beta
   ```

2. **Update imports** (AI SDK v5 uses different message types):
   ```ts
   // Old (v4)
   const messages = [{ role: 'user', content: 'Hello' }];

   // New (v5)
   import { convertToModelMessages } from 'ai';
   const messages = convertToModelMessages(uiMessages);
   ```

3. **Update streaming** (new protocol in v5):
   ```ts
   // Old (v4)
   const stream = await streamText(/* ... */);

   // New (v5)
   const { textStream } = streamText(/* ... */);
   for await (const delta of textStream) {
     // handle delta
   }
   ```

See the [AI SDK v5 migration guide](https://sdk.vercel.ai/docs/migration-guides) for complete details.

## Examples

### Customer Support Bot

```ts
const supportBot = async (userMessage: string, userId: string) => {
  return await generateText({
    model: requesty.chat('anthropic/claude-3.5-sonnet'),
    prompt: `Customer: ${userMessage}`,
    providerOptions: {
      requesty: {
        tags: ['customer-support'],
        user_id: userId,
        extra: {
          department: 'support',
          priority: 'normal',
        },
      },
    },
  });
};
```

### Content Generation Pipeline

```ts
const generateBlogPost = async (topic: string) => {
  const { text } = await generateText({
    model: requesty.chat('openai/gpt-4o'),
    prompt: `Write a blog post about: ${topic}`,
    providerOptions: {
      requesty: {
        tags: ['content-generation', 'blog'],
        trace_id: `blog_${Date.now()}`,
        extra: {
          content_type: 'blog_post',
          topic: topic,
        },
      },
    },
  });

  return text;
};
```

### AI Agent with Tools

```ts
const researchAgent = async (query: string) => {
  const { text, toolResults } = await generateText({
    model: requesty.chat('openai/gpt-4o'),
    prompt: `Research and analyze: ${query}`,
    tools: {
      webSearch: searchTool,
      summarize: summarizeTool,
      saveToDatabase: saveTool,
    },
    stopWhen: stepCountIs(10),
    providerOptions: {
      requesty: {
        tags: ['research', 'agent'],
        trace_id: `research_${Date.now()}`,
      },
    },
  });

  return { analysis: text, sources: toolResults };
};
```

## Error Handling

```ts
import {
  NoSuchToolError,
  InvalidToolArgumentsError,
  ToolExecutionError
} from 'ai';

try {
  const result = await generateText({
    model: requesty.chat('openai/gpt-4o'),
    tools: { myTool },
    prompt: 'Use the tool',
  });
} catch (error) {
  if (NoSuchToolError.isInstance(error)) {
    console.log('Tool not found');
  } else if (InvalidToolArgumentsError.isInstance(error)) {
    console.log('Invalid tool arguments');
  } else if (ToolExecutionError.isInstance(error)) {
    console.log('Tool execution failed');
  }
}
```

## Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## License

Apache-2.0 - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://docs.requesty.ai/)
- 💬 [Discord Community](https://discord.gg/requesty)
- 📧 [Support Email](mailto:support@requesty.ai)
- 🐛 [Report Issues](https://github.com/requestyai/ai-sdk-requesty/issues)

---

**Made with ❤️ by the [Requesty](https://requesty.ai) team**
