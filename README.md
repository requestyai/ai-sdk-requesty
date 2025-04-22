# Requesty Provider for AI SDK

The [Requesty](https://requesty.ai/) provider for the [AI SDK](https://sdk.vercel.ai/docs) gives access to over 300 large language models through the Requesty chat and completion APIs.

## Setup

```bash
# For pnpm
pnpm add @ai-sdk/requesty

# For npm
npm install @ai-sdk/requesty

# For yarn
yarn add @ai-sdk/requesty
```

## Provider Instance

You can import the default provider instance `requesty` from `@ai-sdk/requesty`:

```ts
import { requesty } from '@ai-sdk/requesty';
```

## Example

```ts
import { requesty } from '@ai-sdk/requesty';
import { generateText } from 'ai';

const { text } = await generateText({
  model: requesty('openai/gpt-4o'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

## Supported models

This list is not a definitive list of models supported by Requesty, as it constantly changes as we add new models (and deprecate old ones) to our system.
You can find the latest list of models supported by Requesty [here](hhttps://www.requesty.ai/solution/llm-routing/models).

You can find the latest list of tool-supported models supported by Requesty [here](https://www.requesty.ai/solution/llm-routing/models). (Note: This list may contain models that are not compatible with the AI SDK.)

## Passing Extra Body to Requesty

There are 3 ways to pass extra body to Requesty:

1. Via the `providerOptions.requesty` property:

   ```typescript
   import { createRequesty } from '@ai-sdk/requesty';
   import { streamText } from 'ai';

   const requesty = createRequesty({ apiKey: 'your-api-key' });
   const model = requesty('anthropic/claude-3.7-sonnet:thinking');
   await streamText({
     model,
     messages: [{ role: 'user', content: 'Hello' }],
     providerOptions: {
       requesty: {
         reasoning: {
           max_tokens: 10,
         },
       },
     },
   });
   ```

2. Via the `extraBody` property in the model settings:

   ```typescript
   import { createRequesty } from '@ai-sdk/requesty';
   import { streamText } from 'ai';

   const requesty = createRequesty({ apiKey: 'your-api-key' });
   const model = requesty('anthropic/claude-3.7-sonnet:thinking', {
     extraBody: {
       reasoning: {
         max_tokens: 10,
       },
     },
   });
   await streamText({
     model,
     messages: [{ role: 'user', content: 'Hello' }],
   });
   ```

3. Via the `extraBody` property in the model factory.

   ```typescript
   import { createRequesty } from '@ai-sdk/requesty';
   import { streamText } from 'ai';

   const requesty = createRequesty({
     apiKey: 'your-api-key',
     extraBody: {
       reasoning: {
         max_tokens: 10,
       },
     },
   });
   const model = requesty('anthropic/claude-3.7-sonnet:thinking');
   await streamText({
     model,
     messages: [{ role: 'user', content: 'Hello' }],
   });
   ```

## Anthropic Prompt Caching

You can include Anthropic-specific options directly in your messages when using functions like `streamText`. The Requesty provider will automatically convert these messages to the correct format internally.

### Basic Usage

```typescript
import { createRequesty } from '@ai-sdk/requesty';
import { streamText } from 'ai';

const requesty = createRequesty({ apiKey: 'your-api-key' });
const model = requesty('anthropic/<supported-caching-model>');

await streamText({
  model,
  messages: [
    {
      role: 'system',
      content: 'You are a helpful assistant.',
      // Add provider options at the message level
      providerMetadata: {
        // requesty or anthropic
        requesty: {
          // cache_control also works
          // cache_control: { type: 'ephemeral' }
          cacheControl: { type: 'ephemeral' },
        },
      },
    },
    {
      role: 'user',
      content: 'Hello, how are you?',
    },
  ],
});
```

## Features

- **Access to 300+ LLMs**: Use a single API to access models from OpenAI, Anthropic, Google, Mistral, and many more
- **Streaming Support**: Full support for streaming responses for real-time applications
- **Tool Calling**: Utilize function/tool calling capabilities with supported models
- **Cache Control**: Fine-grained control over prompt caching behavior
- **Type Safety**: Built with TypeScript for enhanced developer experience
- **AI SDK Integration**: Seamless integration with the AI SDK ecosystem

## Advanced Configuration

### Custom API URL

You can configure Requesty to use a custom API URL:

```typescript
import { createRequesty } from '@ai-sdk/requesty';

const requesty = createRequesty({
  apiKey: 'your-api-key',
  baseURL: 'https://router.requesty.ai/v1'
});
```

### Headers

Add custom headers to all requests:

```typescript
import { createRequesty } from '@ai-sdk/requesty';

const requesty = createRequesty({
  apiKey: 'your-api-key',
  headers: {
    'Custom-Header': 'custom-value'
  }
});
```

## Model Settings

Configure model-specific settings:

```typescript
import { createRequesty } from '@ai-sdk/requesty';

const requesty = createRequesty({ apiKey: 'your-api-key' });
const model = requesty('openai/gpt-4o', {
  // Specific model to use with this request
  models: ['openai/gpt-4o', 'anthropic/claude-3-opus'],

  // Control the bias of specific tokens in the model's vocabulary
  logitBias: { 50256: -100 },

  // Request token-level log probabilities
  logprobs: 5,

  // Include reasoning/thinking capabilities (for supported models)
  includeReasoning: true,

  // User identifier for tracking or rate limiting
  user: 'user-123',

  // Additional body parameters
  extraBody: {
    custom_field: 'value'
  }
});
```
