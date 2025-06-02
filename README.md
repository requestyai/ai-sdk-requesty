# Requesty Provider for AI SDK

The [Requesty](https://requesty.ai/) provider for the [AI SDK](https://sdk.vercel.ai/docs) gives access to over 300 large language models through the Requesty chat and completion APIs.

## Setup

```bash
# For pnpm
pnpm add @requesty/ai-sdk

# For npm
npm install @requesty/ai-sdk

# For yarn
yarn add @requesty/ai-sdk
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

## Example

```ts
import { requesty } from '@requesty/ai-sdk';
import { generateText } from 'ai';

const { text } = await generateText({
  model: requesty('openai/gpt-4o'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

## Supported models

This list is not a definitive list of models supported by Requesty, as it constantly changes as we add new models (and deprecate old ones) to our system. You can find the latest list of models supported by Requesty [here](hhttps://www.requesty.ai/solution/llm-routing/models).

You can find the latest list of tool-supported models supported by Requesty [here](https://www.requesty.ai/solution/llm-routing/models). (Note: This list may contain models that are not compatible with the AI SDK.)

## Passing Extra Body to Requesty

There are 3 ways to pass extra body to Requesty:

1. Via the `providerOptions.requesty` property:

   ```typescript
   import { createRequesty } from '@requesty/ai-sdk';
   import { streamText } from 'ai';

   const requesty = createRequesty({ apiKey: process.env.REQUESTY_API_KEY });
   const model = requesty('anthropic/claude-3.7-sonnet');
   await streamText({
     model,
     messages: [{ role: 'user', content: 'Hello' }],
     providerOptions: {
       requesty: {
         custom_field: 'value',
       },
     },
   });
   ```

2. Via the `extraBody` property in the model settings:

   ```typescript
   import { createRequesty } from '@requesty/ai-sdk';
   import { streamText } from 'ai';

   const requesty = createRequesty({ apiKey: process.env.REQUESTY_API_KEY });
   const model = requesty('anthropic/claude-3.7-sonnet', {
     extraBody: {
       custom_field: 'value',
     },
   });
   await streamText({
     model,
     messages: [{ role: 'user', content: 'Hello' }],
   });
   ```

3. Via the `extraBody` property in the model factory.

   ```typescript
   import { createRequesty } from '@requesty/ai-sdk';
   import { streamText } from 'ai';

   const requesty = createRequesty({
     apiKey: process.env.REQUESTY_API_KEY,
     extraBody: {
       custom_field: 'value',
     },
   });
   const model = requesty('anthropic/claude-3.7-sonnet');
   await streamText({
     model,
     messages: [{ role: 'user', content: 'Hello' }],
   });
   ```

## Features

- **Access to 300+ LLMs**: Use a single API to access models from OpenAI, Anthropic, Google, Mistral, and many more
- **Streaming Support**: Full support for streaming responses for real-time applications
- **Tool Calling**: Utilize function/tool calling capabilities with supported models
- **Type Safety**: Built with TypeScript for enhanced developer experience
- **AI SDK Integration**: Seamless integration with the AI SDK ecosystem

## Reasoning

Enable reasoning tokens to get insight into the model's reasoning process. Reasoning tokens provide a transparent view of the model's thought steps and are billed as output tokens.

### Reasoning Effort Values

Requesty supports multiple reasoning effort levels:

- `'low'` - Minimal reasoning effort
- `'medium'` - Moderate reasoning effort
- `'high'` - High reasoning effort
- `'max'` - Maximum reasoning effort (Requesty-specific)
- Budget strings (e.g., `"10000"`) - Specific token budget for reasoning

### Provider-Specific Behavior

**OpenAI Models:**

- Accept effort values: `'low'`, `'medium'`, `'high'`
- `'max'` is converted to `'high'`
- Budget strings are converted to effort values:
  - 0-1024 → `'low'`
  - 1025-8192 → `'medium'`
  - 8193+ → `'high'`
- **Note**: OpenAI does NOT share actual reasoning tokens in the response

**Anthropic Models:**

- Effort values are converted to token budgets:
  - `'low'` → 1024 tokens
  - `'medium'` → 8192 tokens
  - `'high'` → 16384 tokens
  - `'max'` → max output tokens - 1
- Budget strings are passed directly
- Reasoning content appears under `reasoning_content` in the response

**Deepseek Models:**

- Enable reasoning automatically (no configuration needed)
- Reasoning content appears under `reasoning_content` in the response

### Usage Examples

#### Using Reasoning Effort

```typescript
import { createRequesty } from '@requesty/ai-sdk';
import { generateText } from 'ai';

const requesty = createRequesty({ apiKey: process.env.REQUESTY_API_KEY });

// Using effort string
const { text, reasoning } = await generateText({
  model: requesty('openai/o3-mini', {
    reasoningEffort: 'medium',
  }),
  prompt: 'Solve this complex problem step by step...',
});

console.log('Response:', text);
console.log('Reasoning:', reasoning);
```

#### Using Budget (Token Limit)

```typescript
import { createRequesty } from '@requesty/ai-sdk';
import { generateText } from 'ai';

const requesty = createRequesty({ apiKey: process.env.REQUESTY_API_KEY });

// Using budget string for precise control
const { text, reasoning } = await generateText({
  model: requesty('anthropic/claude-sonnet-4-0', {
    reasoningEffort: '10000', // 10,000 token budget
  }),
  prompt: 'Analyze this complex scenario...',
});
```

#### Via Provider Options

```typescript
import { createRequesty } from '@requesty/ai-sdk';
import { generateText } from 'ai';

const requesty = createRequesty({ apiKey: process.env.REQUESTY_API_KEY });

const { text, reasoning } = await generateText({
  model: requesty('openai/o3-mini'),
  prompt: 'Think through this problem carefully...',
  providerOptions: {
    requesty: {
      reasoning_effort: 'high',
    },
  },
});
```

### Supported Reasoning Models

- **OpenAI**: `openai/o3-mini`, `openai/o3`
- **Anthropic**: `anthropic/claude-sonnet-4-0`, other Claude reasoning models
- **Deepseek**: All Deepseek reasoning models (automatic reasoning)

## Advanced Configuration

### Custom API URL

You can configure Requesty to use a custom API URL:

```typescript
import { createRequesty } from '@requesty/ai-sdk';

const requesty = createRequesty({
  apiKey: process.env.REQUESTY_API_KEY,
  baseURL: 'https://router.requesty.ai/v1',
});
```

### Headers

Add custom headers to all requests:

```typescript
import { createRequesty } from '@requesty/ai-sdk';

const requesty = createRequesty({
  apiKey: process.env.REQUESTY_API_KEY,
  headers: {
    'Custom-Header': 'custom-value',
  },
});
```

## Model Settings

Configure model-specific settings:

```typescript
import { createRequesty } from '@requesty/ai-sdk';

const requesty = createRequesty({ apiKey: process.env.REQUESTY_API_KEY });
const model = requesty('openai/gpt-4o', {
  // Specific model to use with this request
  models: ['openai/gpt-4o', 'anthropic/claude-3-opus'],

  // Control the bias of specific tokens in the model's vocabulary
  logitBias: { 50256: -100 },

  // Request token-level log probabilities
  logprobs: 5,

  // User identifier for tracking or rate limiting
  user: 'user-123',

  // Additional body parameters
  extraBody: {
    custom_field: 'value',
  },
});
```
