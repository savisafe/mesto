// Нормализация Instagram-ника на публичной странице.
// Принимаем «@nick», «nick» или ссылку на профиль и приводим к чистому нику.

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
