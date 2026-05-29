import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        // Один процесс на весь прогон — pglite-инстансы держим в памяти
        // воркера, изоляция между тестами через resetDb() в beforeEach.
        fileParallelism: false,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
