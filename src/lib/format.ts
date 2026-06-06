// Чистые форматтеры (без server-only) — можно использовать на клиенте.

export function formatMoney(amount: number, currency: string): string {
    const symbol = currency === 'KZT' ? '₸' : currency === 'RUB' ? '₽' : currency;
    return `${amount.toLocaleString('ru-RU')} ${symbol}`;
}

export function formatDuration(minutes: number): string {
    if (minutes <= 0) return '0';
    if (minutes >= 1440 && minutes % 1440 === 0) {
        const days = minutes / 1440;
        return `${days} ${days === 1 ? 'день' : 'дн'}`;
    }
    if (minutes >= 60 && minutes % 60 === 0) {
        const hours = minutes / 60;
        return `${hours} ${hours === 1 ? 'час' : 'ч'}`;
    }
    return `${minutes} мин`;
}

// "HH:MM" в заданной таймзоне.
export function formatTime(date: Date | string, timeZone: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
    }).format(new Date(date));
}

// "5 июня, чт" в заданной таймзоне.
export function formatDayLabel(date: Date | string, timeZone: string): string {
    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        weekday: 'short',
        timeZone,
    }).format(new Date(date));
}
