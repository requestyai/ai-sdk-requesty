import { defineConfig } from 'vitest/config'

// https://vitejs.dev/config/
export default defineConfig({
    test: {
        environment: 'edge-runtime',
        include: ['**/*.test.ts', '**/*.test.tsx'],
        exclude: ['**/e2e/**', '**/node_modules/**', '**/dist/**'],
    },
})
