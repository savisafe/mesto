import 'server-only';
import { and, eq, gt, isNull } from 'drizzle-orm';
import * as argon2 from '@node-rs/argon2';
import { db } from '@/db';
import {
    users,
    emailTokens,
    type User,
    type PublicUser,
    type EmailTokenKind,
    toPublicUser,
} from '@/db/schema';
import { randomToken, sha256 } from '@/lib/crypto';
import { sendVerifyEmail, sendMagicLinkEmail } from './email';

const EMAIL_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 час
const MIN_PASSWORD_LENGTH = 8;

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

export interface RegisterInput {
    email: string;
    password: string;
    name: string;
    phone?: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

function normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
}

function looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function register(input: RegisterInput): Promise<ServiceResult<PublicUser>> {
    const email = normalizeEmail(input.email);
    const name = input.name?.trim() ?? '';
    const phone = input.phone?.trim() || null;

    if (!looksLikeEmail(email)) {
        return { ok: false, error: 'Некорректный email', code: 'INVALID_EMAIL' };
    }
    if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
        return {
            ok: false,
            error: `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`,
            code: 'WEAK_PASSWORD',
        };
    }
    if (!name) {
        return { ok: false, error: 'Имя обязательно', code: 'INVALID_NAME' };
    }

    const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    if (existing.length > 0) {
        return { ok: false, error: 'Этот email уже зарегистрирован', code: 'EMAIL_TAKEN' };
    }

    const passwordHash = await argon2.hash(input.password);

    // Подтверждение email временно отключено: создаём аккаунт сразу
    // подтверждённым и не отправляем письмо. Логика verifyEmail/resend
    // оставлена в коде, чтобы вернуть подтверждение позже.
    const [user] = await db
        .insert(users)
        .values({ email, passwordHash, name, phone, isEmailVerified: true })
        .returning();

    return { ok: true, data: toPublicUser(user) };
}

export async function login(input: LoginInput): Promise<ServiceResult<PublicUser>> {
    const email = normalizeEmail(input.email);
    if (!email || !input.password) {
        return { ok: false, error: 'Email и пароль обязательны' };
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
        return { ok: false, error: 'Неверный email или пароль', code: 'INVALID_CREDENTIALS' };
    }

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
        return { ok: false, error: 'Неверный email или пароль', code: 'INVALID_CREDENTIALS' };
    }

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    return { ok: true, data: toPublicUser(user) };
}

async function createEmailToken(userId: string, kind: EmailTokenKind): Promise<string> {
    const token = randomToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);
    await db.insert(emailTokens).values({ userId, tokenHash, kind, expiresAt });
    return token;
}

async function consumeEmailToken(
    token: string,
    kind: EmailTokenKind,
): Promise<User | null> {
    const tokenHash = sha256(token);
    const [row] = await db
        .select({ tok: emailTokens, user: users })
        .from(emailTokens)
        .innerJoin(users, eq(emailTokens.userId, users.id))
        .where(
            and(
                eq(emailTokens.tokenHash, tokenHash),
                eq(emailTokens.kind, kind),
                gt(emailTokens.expiresAt, new Date()),
                isNull(emailTokens.consumedAt),
            ),
        )
        .limit(1);

    if (!row) return null;

    await db
        .update(emailTokens)
        .set({ consumedAt: new Date() })
        .where(eq(emailTokens.id, row.tok.id));

    return row.user;
}

export async function sendEmailVerification(userId: string, email: string): Promise<void> {
    const token = await createEmailToken(userId, 'verify');
    await sendVerifyEmail(email, token);
}

export async function verifyEmail(token: string): Promise<ServiceResult<PublicUser>> {
    const user = await consumeEmailToken(token, 'verify');
    if (!user) {
        return { ok: false, error: 'Ссылка недействительна или истекла', code: 'INVALID_TOKEN' };
    }
    if (!user.isEmailVerified) {
        await db.update(users).set({ isEmailVerified: true }).where(eq(users.id, user.id));
        user.isEmailVerified = true;
    }
    return { ok: true, data: toPublicUser(user) };
}

export async function resendVerification(email: string): Promise<ServiceResult<{ sent: boolean }>> {
    const normEmail = normalizeEmail(email);
    if (!looksLikeEmail(normEmail)) {
        return { ok: false, error: 'Некорректный email', code: 'INVALID_EMAIL' };
    }
    const [user] = await db.select().from(users).where(eq(users.email, normEmail)).limit(1);
    if (user && !user.isEmailVerified) {
        await sendEmailVerification(user.id, user.email);
    }
    // Возвращаем sent: true даже если юзера нет — защита от email enumeration.
    return { ok: true, data: { sent: true } };
}

export async function requestMagicLink(email: string): Promise<ServiceResult<{ sent: boolean }>> {
    const normEmail = normalizeEmail(email);
    if (!looksLikeEmail(normEmail)) {
        return { ok: false, error: 'Некорректный email', code: 'INVALID_EMAIL' };
    }
    const [user] = await db.select().from(users).where(eq(users.email, normEmail)).limit(1);
    if (user) {
        const token = await createEmailToken(user.id, 'magic_link');
        await sendMagicLinkEmail(user.email, token);
    }
    return { ok: true, data: { sent: true } };
}

export async function consumeMagicLink(token: string): Promise<ServiceResult<PublicUser>> {
    const user = await consumeEmailToken(token, 'magic_link');
    if (!user) {
        return { ok: false, error: 'Ссылка недействительна или истекла', code: 'INVALID_TOKEN' };
    }
    // Magic-link одновременно подтверждает владение email.
    const updates: Partial<typeof users.$inferInsert> = { lastLoginAt: new Date() };
    if (!user.isEmailVerified) {
        updates.isEmailVerified = true;
        user.isEmailVerified = true;
    }
    await db.update(users).set(updates).where(eq(users.id, user.id));
    return { ok: true, data: toPublicUser(user) };
}
