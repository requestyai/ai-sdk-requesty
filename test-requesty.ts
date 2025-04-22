import { generateText } from 'ai';

import { createRequesty } from './src/requesty-provider';

const requestyRouter = createRequesty();

async function runTest(): Promise<void> {
  try {
    console.log('Testing Requesty AI Router...');

    // Create a model instance
    const model = requestyRouter.chat('openai/gpt-4o-mini');

    // Generate text with a simple prompt
    const { text } = await generateText({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: 'Write a short haiku about clouds.' },
      ],
    });

    console.log('Response:');
    console.log(text);

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
runTest();
