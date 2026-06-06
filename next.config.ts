import type { NextConfig } from "next";

// Идентификатор сборки: на Vercel — хэш коммита (меняется каждый деплой),
// локально — таймстамп сборки. Пробрасывается в клиент и в URL service worker
// (?v=), чтобы браузер замечал новую версию и предлагал обновление.
const buildId =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? Date.now().toString();

const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_BUILD_ID: buildId,
    },
};

export default nextConfig;
