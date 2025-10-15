import { config } from 'dotenv'
import { resolve } from 'path'
import { beforeAll } from 'vitest'

config({ path: resolve(__dirname, '.env'), quiet: true })

beforeAll(() => {
    if (!process.env.REQUESTY_API_KEY) {
        throw new Error(
            'REQUESTY_API_KEY is not set. Please copy src/e2e/.env.example to src/e2e/.env and add your API key.',
        )
    }
    if (!process.env.REQUESTY_BASE_URL) {
        throw new Error(
            'REQUESTY_BASE_URL is not set. Please copy src/e2e/.env.example to src/e2e/.env and add your base URL.',
        )
    }
})
