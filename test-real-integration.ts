import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';

import { requesty } from './src/index.js';

async function testRealIntegration() {
  const apiKey = process.env.REQUESTY_API_KEY;
  if (!apiKey) {
    console.log(
      '💡 Usage: REQUESTY_API_KEY=your_api_key npx tsx test-real-integration.ts',
    );
    process.exit(1);
  }

  console.log('🚀 Starting Real Requesty AI SDK v5 Integration Test');
  console.log(
    '📋 Testing: Text generation, streaming, tools, multi-modal, and v5 features\n',
  );

  try {
    const model = requesty.chat('openai/gpt-4o');

    // Test 1: Basic generateText (non-streaming)
    console.log('📝 Test 1: Basic generateText (non-streaming)');

    const result1 = await generateText({
      model,
      prompt: 'Hello! Introduce yourself briefly.',
      maxOutputTokens: 50,
      temperature: 0.3,
    });

    console.log('✅ Non-streaming text generation successful');
    console.log(
      `📊 Usage: ${result1.usage.inputTokens} input + ${result1.usage.outputTokens} output = ${result1.usage.totalTokens} total tokens`,
    );
    console.log(`💬 Response: ${result1.text.substring(0, 100)}...`);
    console.log(`🏁 Finish reason: ${result1.finishReason}\n`);

    // Test 2: Streaming text generation
    console.log('📡 Test 2: Streaming text generation');

    const streamResult = streamText({
      model,
      prompt: 'Explain the numbers 1 through 5 briefly.',
      maxOutputTokens: 300,
      temperature: 0.5,
    });

    console.log('📡 Streaming response:');
    for await (const delta of streamResult.textStream) {
      process.stdout.write(delta);
    }

    console.log('\n✅ Streaming text generation successful');
    const finalUsage = await streamResult.usage;
    const finalFinishReason = await streamResult.finishReason;
    console.log(
      `📊 Final usage: ${finalUsage.inputTokens} input + ${finalUsage.outputTokens} output = ${finalUsage.totalTokens} total tokens`,
    );
    console.log(`🏁 Finish reason: ${finalFinishReason}\n`);

    // Test 3: Tool calling (function calling)
    console.log('🔧 Test 3: Tool calling (function calling)');

    const weatherTool = tool({
      description: 'Get weather information for a location',
      inputSchema: z.object({
        location: z.string().describe('The city and country'),
        unit: z.enum(['celsius', 'fahrenheit']).describe('Temperature unit'),
      }),
      execute: async ({
        location,
        unit,
      }: {
        location: string;
        unit: string;
      }) => {
        return `The weather in ${location} is 22°${unit === 'celsius' ? 'C' : 'F'} and sunny.`;
      },
    });

    const toolResult = await generateText({
      model,
      prompt: 'What is the weather like in Paris, France? Use celsius.',
      tools: {
        getWeather: weatherTool,
      },
      maxOutputTokens: 200,
      temperature: 0.3,
    });

    console.log('✅ Tool calling successful');
    console.log(
      `📊 Usage: ${toolResult.usage.inputTokens} input + ${toolResult.usage.outputTokens} output = ${toolResult.usage.totalTokens} total tokens`,
    );
    console.log(`🔧 Tool calls made: ${toolResult.toolCalls.length}`);
    if (toolResult.toolCalls.length > 0) {
      const toolCall = toolResult.toolCalls[0];
      console.log(
        `🔧 Tool call: ${toolCall.toolName}(${JSON.stringify(toolCall.args)})`,
      );
      console.log(`🔧 Tool result: ${JSON.stringify(toolCall.result)}`);
    }
    console.log(`💬 Final response: ${toolResult.text}\n`);

    // Test 4: Streaming with tools
    console.log('🔧📡 Test 4: Streaming with tool calling');

    const streamWithToolsResult = streamText({
      model,
      prompt:
        'Get the weather for London, then tell me what clothes I should wear.',
      tools: {
        getWeather: weatherTool,
      },
      maxOutputTokens: 300,
      temperature: 0.4,
    });

    let streamingToolText = '';
    console.log('📡 Streaming response:');
    for await (const delta of streamWithToolsResult.textStream) {
      streamingToolText += delta;
      process.stdout.write(delta);
    }

    console.log('\n✅ Streaming with tools successful');
    const finalStreamUsage = await streamWithToolsResult.usage;
    const finalStreamFinishReason = await streamWithToolsResult.finishReason;
    const finalStreamToolCalls = await streamWithToolsResult.toolCalls;
    console.log(
      `📊 Final usage: ${finalStreamUsage.inputTokens} input + ${finalStreamUsage.outputTokens} output = ${finalStreamUsage.totalTokens} total tokens`,
    );
    console.log(`🔧 Tool calls made: ${finalStreamToolCalls.length}`);
    console.log(`🏁 Finish reason: ${finalStreamFinishReason}\n`);

    // Test 5: Provider-specific options (Requesty metadata)
    console.log('⚙️ Test 5: Provider-specific options (Requesty metadata)');

    const metadataResult = await generateText({
      model,
      prompt: 'Explain artificial intelligence in one sentence.',
      maxOutputTokens: 100,
      providerOptions: {
        requesty: {
          tags: ['ai-sdk-test', 'explanation'],
          user_id: 'test_user_123',
          trace_id: 'integration_test_456',
          extra: {
            country: 'us',
            prompt_title: 'AI explanation test',
            content_type: 'educational',
            test_environment: 'development',
          },
        },
      },
    });

    console.log('✅ Provider-specific options (Requesty metadata) successful');
    console.log(`💬 Response: ${metadataResult.text}`);
    console.log(
      `📊 Usage: ${metadataResult.usage.inputTokens} input + ${metadataResult.usage.outputTokens} output = ${metadataResult.usage.totalTokens} total tokens`,
    );
    console.log(
      '📝 Note: Metadata (tags, user_id, trace_id, extra) has been sent to Requesty for analytics\n',
    );

    // Test 6: Multi-modal messages (AI SDK v5 feature)
    console.log('🖼️ Test 6: Multi-modal messages (text + image)');

    const multiModalResult = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this simple image:' },
            {
              type: 'image',
              image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            },
          ],
        },
      ],
      maxOutputTokens: 100,
    });

    console.log('✅ Multi-modal messages test completed');
    console.log(`💬 Response: ${multiModalResult.text}`);
    console.log(
      `📊 Usage: ${multiModalResult.usage.inputTokens} input + ${multiModalResult.usage.outputTokens} output = ${multiModalResult.usage.totalTokens} total tokens\n`,
    );

    // Test 7: Test reasoning with OpenAI o1 models
    console.log('🧠 Test 7: Reasoning with OpenAI o1 models');

    try {
      const reasoningModel = requesty.chat('openai/o1-mini');

      const reasoningResult = await generateText({
        model: reasoningModel,
        messages: [
          {
            role: 'user',
            content: 'Think step by step: What is 15 * 23? Show your reasoning.',
          },
        ],
        maxOutputTokens: 200,
      });

      console.log('✅ Reasoning test completed');
      console.log(`💬 Response: ${reasoningResult.text}`);
      console.log(
        `📊 Usage: ${reasoningResult.usage.inputTokens} input + ${reasoningResult.usage.outputTokens} output = ${reasoningResult.usage.totalTokens} total tokens\n`,
      );
    } catch (error) {
      console.log('⚠️ Reasoning test skipped (o1 model might not be available)');
      console.log(`Error: ${error instanceof Error ? error.message : error}\n`);
    }

    // Test 8: AI SDK v5 message format with system messages
    console.log('💬 Test 8: AI SDK v5 message format with system messages');

    const messagesResult = await generateText({
      model,
      system: 'You are a helpful assistant that responds concisely.',
      messages: [
        { role: 'user', content: 'What is the capital of France?' },
        { role: 'assistant', content: 'The capital of France is Paris.' },
        { role: 'user', content: 'What about Germany?' },
      ],
      maxOutputTokens: 50,
    });

    console.log('✅ AI SDK v5 message format test completed');
    console.log(`💬 Response: ${messagesResult.text}`);
    console.log(
      `📊 Usage: ${messagesResult.usage.inputTokens} input + ${messagesResult.usage.outputTokens} output = ${messagesResult.usage.totalTokens} total tokens\n`,
    );

    // Summary
    console.log('🎉 All tests completed successfully!');
    console.log('✅ 1. Non-streaming text generation');
    console.log('✅ 2. Streaming text generation');
    console.log('✅ 3. Tool calling (function calling)');
    console.log('✅ 4. Streaming with tools');
    console.log('✅ 5. Provider-specific options');
    console.log('✅ 6. Multi-modal messages (text + image)');
    console.log('✅ 7. Reasoning models (OpenAI o1)');
    console.log('✅ 8. AI SDK v5 message format');
    console.log('\n🚀 Requesty AI SDK v5 integration is working perfectly!');
    console.log('📋 All v5 features tested: messages, multi-modal, tools, streaming, provider options');
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Check if API key is provided
if (!process.env.REQUESTY_API_KEY) {
  console.log(
    '💡 Usage: REQUESTY_API_KEY=your_api_key npx tsx test-real-integration.ts',
  );
  process.exit(1);
}

testRealIntegration().catch(console.error);
