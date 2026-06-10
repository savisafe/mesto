import type { FinanceGranularity } from '@/services/finance';

export interface DateRange {
    fromDate: string;
    toDate: string;
}

// '__all__' = все сотрудники, '__none__' = без сотрудника, иначе userId.
export const EMPLOYEE_ALL = '__all__';
export const EMPLOYEE_NONE = '__none__';

export function toEmployeeFilter(value: string): string | null | undefined {
    if (value === EMPLOYEE_ALL) return undefined;
    if (value === EMPLOYEE_NONE) return null;
    return value;
}

function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Диапазон дат для пресета периода относительно `ref` (по умолчанию сегодня).
 * Неделя считается с понедельника. Даты — в локальной зоне браузера; сервер
 * интерпретирует их в зоне бизнеса (как и календарь).
 */
export function presetRange(
    granularity: Exclude<FinanceGranularity, 'custom'>,
    ref: Date = new Date(),
): DateRange {
    const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());

    if (granularity === 'day') {
        const s = toDateStr(d);
        return { fromDate: s, toDate: s };
    }
    if (granularity === 'week') {
        const dow = (d.getDay() + 6) % 7; // 0 = понедельник
        const from = new Date(d);
        from.setDate(d.getDate() - dow);
        const to = new Date(from);
        to.setDate(from.getDate() + 6);
        return { fromDate: toDateStr(from), toDate: toDateStr(to) };
    }
    if (granularity === 'month') {
        const from = new Date(d.getFullYear(), d.getMonth(), 1);
        const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return { fromDate: toDateStr(from), toDate: toDateStr(to) };
    }
    // year
    const from = new Date(d.getFullYear(), 0, 1);
    const to = new Date(d.getFullYear(), 11, 31);
    return { fromDate: toDateStr(from), toDate: toDateStr(to) };
}

export function formatMoney(amount: number, currency: string): string {
    const symbol = currency === 'KZT' ? '₸' : currency === 'RUB' ? '₽' : currency;
    return `${amount.toLocaleString('ru-RU')} ${symbol}`;
}

export function formatRangeLabel(range: DateRange): string {
    const fmt = (s: string) =>
        new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(
            new Date(`${s}T00:00:00`),
        );
    if (range.fromDate === range.toDate) return fmt(range.fromDate);
    return `${fmt(range.fromDate)} — ${fmt(range.toDate)}`;
}

export function formatDateTime(d: Date, tz: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: tz,
    }).format(new Date(d));
}
