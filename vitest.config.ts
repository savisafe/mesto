import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        // Один процесс на весь прогон — pglite-инстансы держим в памяти
        // воркера, изоляция между тестами через resetDb() в beforeEach.
        fileParallelism: false,
        // instagrid — изолированный пакет со своим тулингом (свой vitest).
        exclude: [...configDefaults.exclude, 'instagrid/**'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
