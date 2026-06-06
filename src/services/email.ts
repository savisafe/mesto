import 'server-only';
import { Resend } from 'resend';
import nodemailer, { type Transporter } from 'nodemailer';

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

// SMTP: подходит любой провайдер с верификацией одного адреса (single sender) —
// Brevo, Gmail, Mailjet и т.п. Свой домен не нужен, достаточно подтвердить
// один email у провайдера. Используется в приоритете над Resend, если задан.
const smtpHost = process.env.SMTP_HOST;
let smtpTransport: Transporter | null = null;
const getSmtpTransport = (): Transporter | null => {
    if (!smtpHost) return null;
    if (!smtpTransport) {
        smtpTransport = nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: process.env.SMTP_SECURE === 'true', // true для порта 465
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
    }
    return smtpTransport;
};

// Отправитель: задаётся через EMAIL_FROM (для SMTP — верифицированный у
// провайдера адрес, для Resend — адрес на верифицированном домене). По умолчанию
// тестовый sender Resend, доставляющий только на email владельца аккаунта.
const FROM = process.env.EMAIL_FROM ?? 'Mesto <onboarding@resend.dev>';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

interface SendInput {
    to: string;
    subject: string;
    html: string;
}

async function send({ to, subject, html }: SendInput): Promise<void> {
    const smtp = getSmtpTransport();
    if (smtp) {
        await smtp.sendMail({ from: FROM, to, subject, html });
        return;
    }
    if (resend) {
        const { error } = await resend.emails.send({ from: FROM, to, subject, html });
        if (error) {
            console.error('Resend error:', error);
            throw new Error('Failed to send email');
        }
        return;
    }
    // Fallback без провайдера (локалка): ссылка падает в консоль сервера.
    console.log(`[email:console] to=${to} subject="${subject}"`);
    console.log(html);
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
