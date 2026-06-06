import 'server-only';

// Бесплатная отправка через Telegram Bot API. Бот не может написать пользователю
// первым по номеру — подтверждение идёт по deep-link (юзер сам жмёт Start у бота).
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;

export const isTelegramConfigured = (): boolean => Boolean(BOT_TOKEN && BOT_USERNAME);

// Deep-link вида https://t.me/<bot>?start=<token>. Payload Telegram допускает
// только [A-Za-z0-9_-] длиной до 64 — base64url-токен этому удовлетворяет.
export const buildStartLink = (token: string): string | null => {
    if (!BOT_USERNAME) return null;
    return `https://t.me/${BOT_USERNAME}?start=${token}`;
};

export async function sendTelegramMessage(
    chatId: string | number,
    text: string,
): Promise<void> {
    if (!BOT_TOKEN) {
        // Локалка без бота: лог в консоль вместо реальной отправки.
        console.log(`[telegram:console] chat=${chatId} ${text}`);
        return;
    }
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
        console.error('Telegram sendMessage failed:', await res.text());
    }
}
