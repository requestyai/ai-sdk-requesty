import { requesty } from './src/index'
import { tool } from 'ai'
import { z } from 'zod'

// Import Agent from ai SDK v5
// @ts-ignore
const { Experimental_Agent: Agent } = require('ai')

// Create an agent with a name
const weatherAgent = new Agent({
    name: 'weather-agent', // Agent name
    model: requesty.chat('openai/gpt-4o-mini', {
        // Provider-level settings if needed
    }),
    system: 'You are a helpful weather assistant.',
    tools: {
        getWeather: tool({
            description: 'Get the weather in a location',
            inputSchema: z.object({
                location: z
                    .string()
                    .describe('The location to get the weather for'),
            }),
            execute: async ({ location }) => ({
                location,
                temperature: 72 + Math.floor(Math.random() * 21) - 10,
            }),
        }),
    },
})

async function testAgentAnalytics() {
    console.log('🤖 Testing Agent Analytics Collection\n')

    try {
        // Use providerOptions in the generate call
        const result = await weatherAgent.generate({
            prompt: 'What is the weather in San Francisco?',
            providerOptions: {
                requesty: {
                    analytics: true, // ✅ Enable analytics
                    tags: ['agent', 'weather'],
                    user_id: 'test-user-456',
                    extra: {
                        agent_task: 'weather-lookup',
                        custom_data: 'test',
                    },
                },
            },
        })

        console.log('✅ Agent request succeeded!')
        console.log('📝 Response:', result.text)
        console.log('🔧 Steps taken:', result.steps.length)
    } catch (error) {
        console.error('❌ Error:', error)
    }
}

testAgentAnalytics()
