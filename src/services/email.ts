import 'server-only';
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

// Отправитель: задаётся через EMAIL_FROM (адрес на верифицированном в Resend
// домене, например 'Mesto <noreply@mesto.pro>'). По умолчанию — тестовый sender
// Resend, который доставляет письма только на email владельца Resend-аккаунта.
const FROM = process.env.EMAIL_FROM ?? 'Mesto <onboarding@resend.dev>';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

interface SendInput {
    to: string;
    subject: string;
    html: string;
}

async function send({ to, subject, html }: SendInput): Promise<void> {
    if (!resend) {
        // Fallback для локалки без Resend: ссылка падает в консоль сервера.
        console.log(`[email:console] to=${to} subject="${subject}"`);
        console.log(html);
        return;
    }
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
        console.error('Resend error:', error);
        throw new Error('Failed to send email');
    }
}

export async function sendVerifyEmail(to: string, token: string): Promise<void> {
    const url = `${APP_URL}/api/auth/verify/${token}`;
    await send({
        to,
        subject: 'Подтвердите email — Mesto',
        html: `
            <p>Здравствуйте!</p>
            <p>Подтвердите ваш email — перейдите по ссылке:</p>
            <p><a href="${url}">${url}</a></p>
            <p>Ссылка действует 1 час.</p>
        `,
    });
}

export async function sendMagicLinkEmail(to: string, token: string): Promise<void> {
    const url = `${APP_URL}/api/auth/magic/${token}`;
    await send({
        to,
        subject: 'Вход в Mesto',
        html: `
            <p>Здравствуйте!</p>
            <p>Войдите в Mesto — перейдите по ссылке:</p>
            <p><a href="${url}">${url}</a></p>
            <p>Ссылка действует 1 час. Если вы не запрашивали вход — проигнорируйте письмо.</p>
        `,
    });
}

export async function sendInviteEmail(
    to: string,
    businessName: string,
    inviterName: string,
    token: string,
): Promise<void> {
    const url = `${APP_URL}/api/invites/${token}`;
    await send({
        to,
        subject: `Приглашение в «${businessName}» — Mesto`,
        html: `
            <p>Здравствуйте!</p>
            <p>${inviterName} приглашает вас в команду «${businessName}» на Mesto.</p>
            <p>Принять приглашение: <a href="${url}">${url}</a></p>
            <p>Если у вас ещё нет аккаунта Mesto — сначала зарегистрируйтесь с этим email,
               затем перейдите по ссылке снова.</p>
            <p>Ссылка действует 7 дней.</p>
        `,
    });
}
