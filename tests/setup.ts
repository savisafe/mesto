import { vi } from 'vitest';

// 'server-only' — маркер для бандлеров Next/Webpack чтобы файлы не
// попадали в клиентский бандл. В Node-тестах его импорт смысла не имеет.
vi.mock('server-only', () => ({}));
