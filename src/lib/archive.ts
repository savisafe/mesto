// Константы и помощники для архива. Без 'server-only' — могут импортироваться
// из client-компонентов для отображения сроков.

/** Сколько дней архивированный бизнес живёт перед окончательным удалением. */
export const ARCHIVE_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Дней до окончательного удаления; null если ещё активен. */
export function daysUntilPurge(archivedAt: Date | null): number | null {
    if (!archivedAt) return null;
    const ms = archivedAt.getTime() + ARCHIVE_RETENTION_DAYS * DAY_MS - Date.now();
    return Math.max(0, Math.ceil(ms / DAY_MS));
}

/** Склонение «день / дня / дней» для русского. */
export function dayWord(n: number): string {
    const lastTwo = n % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return 'дней';
    const last = n % 10;
    if (last === 1) return 'день';
    if (last >= 2 && last <= 4) return 'дня';
    return 'дней';
}
