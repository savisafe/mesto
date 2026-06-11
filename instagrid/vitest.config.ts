import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Default env is node (pure core/url tests). DOM tests opt in per-file with
// `// @vitest-environment happy-dom`.
export default defineConfig({
    test: {
        environment: 'node',
    },
    resolve: {
        alias: {
            '@instagrid/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
        },
    },
});
