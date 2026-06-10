// Безопасная обработка Instagram на публичной странице.
//
// Виджет (SnapWidget/LightWidget): мы НЕ инжектим сырой HTML/скрипты владельца
// (XSS). Принимаем embed-код, прямой URL или короткий ID виджета SnapWidget и
// пропускаем только https-iframe с разрешённого хоста.
//
// Ник: нормализуем «@nick», «nick» или ссылку на профиль до чистого ника.

const ALLOWED_HOSTS = new Set([
    'snapwidget.com',
    'www.snapwidget.com',
    'lightwidget.com',
    'cdn.lightwidget.com',
]);

/**
 * Принимает embed-код (`<iframe src="...">`), прямой URL или короткий числовой
 * ID виджета SnapWidget. Возвращает безопасный https-URL встраивания с
 * разрешённого хоста или null, если вход некорректен/хост не в allowlist.
 */
export function normalizeInstagramWidgetUrl(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Короткий ID виджета SnapWidget (только цифры) — собираем embed-URL сами.
    if (/^\d{3,15}$/.test(trimmed)) {
        return `https://snapwidget.com/embed/${trimmed}`;
    }

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

// Правила Instagram: 1–30 символов, латиница/цифры/точка/подчёркивание.
const USERNAME_RE = /^[a-zA-Z0-9._]{1,30}$/;

/**
 * Принимает «@nick», «nick» или ссылку на профиль (instagram.com/nick).
 * Возвращает чистый ник в нижнем регистре или null, если ввод не похож на ник.
 */
export function normalizeInstagramUsername(input: string): string | null {
    let value = input.trim();
    if (!value) return null;

    if (value.includes('/')) {
        try {
            const url = new URL(value.startsWith('http') ? value : `https://${value}`);
            value = url.pathname.split('/').filter(Boolean)[0] ?? '';
        } catch {
            return null;
        }
    }

    value = value.replace(/^@+/, '');
    if (!USERNAME_RE.test(value)) return null;
    return value.toLowerCase();
}

/** Ссылка на профиль из уже нормализованного ника. */
export function instagramProfileUrl(username: string): string {
    return `https://instagram.com/${username}`;
}
