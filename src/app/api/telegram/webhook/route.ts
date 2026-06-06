import { NextRequest, NextResponse } from 'next/server';
import { confirmTelegram } from '@/services/auth';
import { sendTelegramMessage } from '@/lib/telegram';

export const runtime = 'nodejs';

// Webhook Telegram-бота. Настраивается один раз через Bot API setWebhook с
// secret_token — Telegram возвращает его в заголовке ниже, проверяем для защиты
// от посторонних запросов.
interface TelegramUpdate {
    message?: {
        text?: string;
        chat?: { id?: number };
    };
}

export async function POST(req: NextRequest): Promise<Response> {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    let update: TelegramUpdate;
    try {
        update = (await req.json()) as TelegramUpdate;
    } catch {
        return NextResponse.json({ ok: true });
    }

    const chatId = update.message?.chat?.id;
    const text = update.message?.text ?? '';

    if (typeof chatId === 'number' && text.startsWith('/start')) {
        const payload = text.slice('/start'.length).trim();
        if (!payload) {
            await sendTelegramMessage(
                chatId,
                'Привет! Откройте ссылку подтверждения из приложения Mesto.',
            );
        } else {
            const result = await confirmTelegram(payload, String(chatId));
            await sendTelegramMessage(
                chatId,
                result.ok
                    ? '✅ Аккаунт Mesto подтверждён! Можете вернуться в приложение.'
                    : '⚠️ Ссылка недействительна или истекла. Запросите новую в приложении.',
            );
        }
    }

    // Всегда отвечаем 200, иначе Telegram будет повторять доставку.
    return NextResponse.json({ ok: true });
}
