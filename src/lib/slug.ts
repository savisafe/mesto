// Транслитерация + нормализация в URL-safe slug. Работает и на сервере, и на
// клиенте (нет server-only-импортов), чтобы превью slug можно было показать в UI.

const CYRILLIC_MAP: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
    щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export const MAX_SLUG_LENGTH = 40;

export function slugify(input: string): string {
    const transliterated = input
        .toLowerCase()
        .split('')
        .map((ch) => (ch in CYRILLIC_MAP ? CYRILLIC_MAP[ch] : ch))
        .join('');

    return transliterated
        .replace(/[^a-z0-9]+/g, '-') // всё не [a-z0-9] → дефис
        .replace(/^-+|-+$/g, '') // обрезаем дефисы по краям
        .slice(0, MAX_SLUG_LENGTH)
        .replace(/-+$/g, ''); // на случай обрезки посреди дефиса
}

// Валиден ли slug как итоговое значение (после slugify он всегда валиден).
export function isValidSlug(slug: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= MAX_SLUG_LENGTH;
}
