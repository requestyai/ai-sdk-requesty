import { defineConfig } from 'vitest/config'

// https://vitejs.dev/config/
export default defineConfig({
    test: {
        environment: 'node',
        include: ['**/e2e/**/*.test.ts'],
        testTimeout: 30000,
    },
})
