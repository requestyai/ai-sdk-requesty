import { defineConfig } from 'tsdown'

export default defineConfig([
    {
        entry: ['src/index.ts'],
        format: ['cjs', 'esm'],
        dts: true,
        sourcemap: true,
    },
    {
        entry: ['src/internal/index.ts'],
        outDir: 'dist/internal',
        format: ['cjs', 'esm'],
        dts: true,
        sourcemap: true,
    },
])
