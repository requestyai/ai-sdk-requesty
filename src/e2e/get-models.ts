import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '.env'), quiet: true })

export interface TestModel {
    id: string
    name: string
}

const DEFAULT_TEST_MODELS: TestModel[] = [
    { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini' },
    { id: 'openai/gpt-5-chat-latest', name: 'OpenAI GPT-5' },
    { id: 'anthropic/claude-sonnet-4-5-20250929', name: 'Claude 4.5 Sonnet' },
    { id: 'mistral/mistral-medium-latest', name: 'Mistral Medium' },
    { id: 'openai/gpt-4.1', name: 'OpenAI GPT 4.1' },
]

export function getTestModels(): TestModel[] {
    if (!process.env.TEST_MODELS) {
        return DEFAULT_TEST_MODELS
    }

    return process.env.TEST_MODELS.split(',').map((model) => {
        const [id, name] = model.split(':')
        return { id: id || '', name: name || id || '' }
    })
}
