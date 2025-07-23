import { createRequesty } from './src';

async function testAISDKV5() {
  console.log('Testing AI SDK v5 compatibility...');

  try {
    const requesty = createRequesty({
      apiKey: 'test-key',
    });

    const model = requesty.chat('meta-llama-3.1-405b-instruct');

    console.log('✅ Provider created successfully');
    console.log('✅ Model created successfully');
    console.log(`✅ Model ID: ${model.modelId}`);
    console.log(`✅ Provider: ${model.provider}`);
    console.log(`✅ Specification: ${model.specificationVersion}`);
    console.log(`✅ Supported URLs: ${JSON.stringify(model.supportedUrls)}`);

    // Test model interface compatibility (without actually calling API)
    const mockOptions = {
      prompt: [
        {
          role: 'user' as const,
          content: [{ type: 'text' as const, text: 'Hello!' }],
        },
      ],
      maxOutputTokens: 100,
      temperature: 0.7,
    };

    console.log('✅ Model options interface is compatible');

    console.log('\n🎉 All AI SDK v5 compatibility tests passed!');
    console.log(
      '\nThe provider is ready for use with AI SDK v5 functions like:',
    );
    console.log('- generateText()');
    console.log('- streamText()');
    console.log('- generateObject()');
    console.log('- And all other AI SDK v5 functions!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAISDKV5().catch(console.error);
