export interface TestModel {
    id: string
    name: string
}

const DEFAULT_TEST_MODELS: TestModel[] = [
    { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini' },
    { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
    { id: 'anthropic/claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
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
