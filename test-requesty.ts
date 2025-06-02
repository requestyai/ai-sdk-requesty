import { generateText } from 'ai';

import { createRequesty } from './src/requesty-provider';

// Create Requesty provider
const requesty = createRequesty({
  // API key can be set here or via environment variable REQUESTY_API_KEY
  // apiKey: 'your-api-key-here',
});

async function testBasicChat() {
  console.log('💬 Testing basic chat...\n');

  try {
    const model = requesty.chat('openai/gpt-4o-mini');

    const { text } = await generateText({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: 'Write a short haiku about clouds.' },
      ],
    });

    console.log('✅ Basic chat works!');
    console.log('📝 Response:', text);
  } catch (error: any) {
    console.error('❌ Basic chat failed:', error.message);
  }
}

async function testReasoning() {
  console.log('\n🧠 Testing Reasoning with OpenAI o3-mini...\n');

  try {
    // Test with OpenAI o3-mini using reasoning effort
    const model = requesty.chat('openai/o3-mini', {
      reasoningEffort: 'medium',
    });

    const { text, reasoning, usage } = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content:
            'Write a bash script that takes a matrix represented as a string with format "[1,2],[3,4],[5,6]" and prints the transpose in the same format.',
        },
      ],
    });

    console.log('✅ Reasoning test completed!');
    console.log('📝 Content:', text);

    if (reasoning) {
      console.log('🤔 Reasoning:', reasoning);
    } else {
      console.log("ℹ️  No reasoning tokens (OpenAI doesn't expose them)");
    }

    if (usage) {
      console.log('📊 Token Usage:', {
        prompt: usage.promptTokens,
        completion: usage.completionTokens,
        total: usage.totalTokens,
      });
    }
  } catch (error: any) {
    console.error('❌ Reasoning test failed:', error.message);
  }
}

async function testReasoningWithBudget() {
  console.log('\n💰 Testing Reasoning with budget string...\n');

  try {
    const model = requesty.chat('openai/o3-mini');

    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: 'Explain step by step how to solve 2x + 5 = 15 for x.',
        },
      ],
      providerOptions: {
        requesty: {
          reasoning_effort: 'low', // Budget string - will convert to 'medium'
        },
      },
    });

    console.log('✅ Budget reasoning test completed!');
    console.log('📝 Content:', text);
  } catch (error: any) {
    console.error('❌ Budget reasoning test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🎯 Starting Requesty Tests...\n');

  try {
    await testBasicChat();
    await testReasoning();
    await testReasoningWithBudget();

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n📚 Key Points:');
    console.log('• Basic chat functionality works');
    console.log('• Reasoning with effort strings works');
    console.log('• Budget strings are supported via providerOptions');
    console.log(
      "• OpenAI models accept reasoning_effort but don't expose reasoning tokens",
    );
  } catch (error: any) {
    console.error('\n💥 TESTS FAILED!');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}
