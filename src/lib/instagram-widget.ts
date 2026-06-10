// Безопасная обработка Instagram-виджета. Мы НЕ инжектим сырой HTML/скрипты
// владельца на публичную страницу (XSS). Вместо этого принимаем embed-код или
// прямой URL, извлекаем iframe-src и пропускаем только https с разрешённого хоста.

const ALLOWED_HOSTS = new Set([
    'snapwidget.com',
    'www.snapwidget.com',
    'lightwidget.com',
    'cdn.lightwidget.com',
]);

/**
 * Принимает либо полный embed-код (`<iframe src="...">`), либо прямой URL.
 * Возвращает безопасный https-URL встраивания с разрешённого хоста или null,
 * если вход некорректен/хост не в allowlist.
 */
export function normalizeInstagramWidgetUrl(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const srcMatch = trimmed.match(/src\s*=\s*["']([^"']+)["']/i);
    const candidate = srcMatch ? srcMatch[1] : trimmed;

    let url: URL;
    try {
        url = new URL(candidate);
    } catch {
        return null;
    }

    if (url.protocol !== 'https:') return null;
    if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;

    // Отбрасываем потенциально опасные части, оставляем чистый origin+path+query.
    return `${url.origin}${url.pathname}${url.search}`;
}
