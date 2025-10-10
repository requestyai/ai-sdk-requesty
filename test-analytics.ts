import { requesty } from './src/index'
import { generateText } from 'ai'

async function testAnalytics() {
    console.log('🧪 Testing Requesty Analytics Collection\n')

    try {
        const { text } = await generateText({
            model: requesty.chat('openai/gpt-4o-mini'),
            prompt: 'Say hello in one sentence',
            maxOutputTokens: 50,
            providerOptions: {
                requesty: {
                    tags: ['test', 'analytics'],
                    user_id: 'test-user-123',
                    analytics: true, // ✅ Enable analytics
                    extra: {
                        // User's custom extra data
                        test_type: 'analytics-test',
                        custom_field: 'user-value',
                    },
                },
            },
        })

        console.log('✅ Request succeeded!')
        console.log('📝 Response:', text)
    } catch (error) {
        console.error('❌ Error:', error)
    }
}

testAnalytics()
