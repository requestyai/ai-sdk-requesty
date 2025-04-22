"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_1 = require("ai");
const requesty_provider_1 = require("./src/requesty-provider");
const requestyRouter = (0, requesty_provider_1.createRequesty)();
async function runTest() {
    try {
        console.log('Testing Requesty AI Router...');
        // Create a model instance
        const model = requestyRouter.chat('openai/gpt-4o-mini');
        // Generate text with a simple prompt
        const { text } = await (0, ai_1.generateText)({
            model,
            messages: [
                { role: 'system', content: 'You are a helpful AI assistant.' },
                { role: 'user', content: 'Write a short haiku about clouds.' },
            ],
        });
        console.log('Response:');
        console.log(text);
        console.log('\nTest completed successfully!');
    }
    catch (error) {
        console.error('Error during test:', error);
    }
}
// Run the test
runTest();
