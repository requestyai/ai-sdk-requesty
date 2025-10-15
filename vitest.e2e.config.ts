import { defineConfig } from 'vitest/config'

// https://vitejs.dev/config/
export default defineConfig({
    test: {
        environment: 'node',
        include: ['**/e2e/**/*.test.ts'],
        testTimeout: 30000,
        globalSetup: ['./src/e2e/global-setup.ts'],
        setupFiles: ['./src/e2e/setup.ts'],

        slowTestThreshold: 20_000,
    },
})
