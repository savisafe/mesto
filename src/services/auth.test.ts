import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

vi.mock('@/services/email', () => ({
    sendVerifyEmail: vi.fn(),
    sendMagicLinkEmail: vi.fn(),
}));

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendVerifyEmail, sendMagicLinkEmail } from '@/services/email';
import {
    register,
    login,
    requestMagicLink,
    consumeMagicLink,
    verifyEmail,
    resendVerification,
    confirmTelegram,
} from './auth';
import { sha256 } from '@/lib/crypto';

const mockSendVerify = vi.mocked(sendVerifyEmail);
const mockSendMagic = vi.mocked(sendMagicLinkEmail);

async function resetAll() {
    await db.delete(schema.businessMembers);
    await db.delete(schema.businesses);
    await db.delete(schema.emailTokens);
    await db.delete(schema.sessions);
    await db.delete(schema.users);
}

beforeEach(async () => {
    await resetAll();
    mockSendVerify.mockReset();
    mockSendMagic.mockReset();
});

describe('register', () => {
    it('создаёт пользователя и хэширует пароль', async () => {
        const result = await register({
            email: 'Foo@Bar.com',
            password: 'super-secret-pw',
            name: 'Foo',
            phone: '+79991234567',
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        // email нормализуется в lowercase
        expect(result.data.email).toBe('foo@bar.com');
        // passwordHash не утекает наружу
        expect(result.data).not.toHaveProperty('passwordHash');

        // в БД пароль захэширован, не plain-text
        const [stored] = await db.select().from(schema.users).where(eq(schema.users.id, result.data.id));
        expect(stored.passwordHash).not.toContain('super-secret-pw');
        expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    });

    it('инициирует отправку письма верификации', async () => {
        await register({ email: 'a@b.c', password: 'goodpass1', name: 'A', phone: '+79991234567' });
        // sendEmailVerification вызывается через void → ждём один tick
        await new Promise((r) => setImmediate(r));
        expect(mockSendVerify).toHaveBeenCalledOnce();
        expect(mockSendVerify).toHaveBeenCalledWith('a@b.c', expect.any(String));
    });

    it('отклоняет некорректный email', async () => {
        const result = await register({ email: 'not-an-email', password: 'goodpass1', name: 'A', phone: '+79991234567' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('INVALID_EMAIL');
    });

    it('отклоняет короткий пароль', async () => {
        const result = await register({ email: 'a@b.c', password: 'short', name: 'A', phone: '+79991234567' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('WEAK_PASSWORD');
    });

    it('отклоняет пустое имя', async () => {
        const result = await register({ email: 'a@b.c', password: 'goodpass1', name: '   ', phone: '+79991234567' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('INVALID_NAME');
    });

    it('отклоняет дубликат email', async () => {
        await register({ email: 'a@b.c', password: 'goodpass1', name: 'A', phone: '+79991234567' });
        const result = await register({ email: 'A@B.C', password: 'goodpass1', name: 'B', phone: '+79991234567' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('EMAIL_TAKEN');
    });

    it('отклоняет пустой телефон', async () => {
        const result = await register({ email: 'a@b.c', password: 'goodpass1', name: 'A', phone: '   ' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('PHONE_REQUIRED');
    });

    it('отклоняет некорректный телефон', async () => {
        const result = await register({ email: 'a@b.c', password: 'goodpass1', name: 'A', phone: '123' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('INVALID_PHONE');
    });

    it('нормализует телефон (убирает пробелы и скобки)', async () => {
        const result = await register({
            email: 'a@b.c',
            password: 'goodpass1',
            name: 'A',
            phone: '+7 (999) 123-45-67',
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const [stored] = await db.select().from(schema.users).limit(1);
        expect(stored.phone).toBe('+79991234567');
    });
});

describe('confirmTelegram', () => {
    async function setupToken(): Promise<{ userId: string; raw: string }> {
        const reg = await register({
            email: 'a@b.c',
            password: 'goodpass1',
            name: 'A',
            phone: '+79991234567',
        });
        if (!reg.ok) throw new Error('register failed');
        const raw = 'tg-raw-token-123';
        await db.insert(schema.emailTokens).values({
            userId: reg.data.id,
            tokenHash: sha256(raw),
            kind: 'telegram_verify',
            expiresAt: new Date(Date.now() + 60_000),
        });
        return { userId: reg.data.id, raw };
    }

    it('подтверждает аккаунт и привязывает chat_id', async () => {
        const { userId, raw } = await setupToken();
        const result = await confirmTelegram(raw, '555000');
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.isEmailVerified).toBe(true);

        const [stored] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
        expect(stored.isEmailVerified).toBe(true);
        expect(stored.telegramChatId).toBe('555000');
    });

    it('одноразовый — повторное использование токена отклоняется', async () => {
        const { raw } = await setupToken();
        const first = await confirmTelegram(raw, '555000');
        const second = await confirmTelegram(raw, '555000');
        expect(first.ok).toBe(true);
        expect(second.ok).toBe(false);
        if (second.ok) return;
        expect(second.code).toBe('INVALID_TOKEN');
    });
});

describe('login', () => {
    beforeEach(async () => {
        await register({ email: 'user@test.local', password: 'correctpassword', name: 'U', phone: '+79991234567' });
    });

    it('возвращает пользователя при верном пароле', async () => {
        const result = await login({ email: 'user@test.local', password: 'correctpassword' });
        expect(result.ok).toBe(true);
    });

    it('обновляет lastLoginAt при успехе', async () => {
        const before = await db.select().from(schema.users).limit(1);
        expect(before[0].lastLoginAt).toBeNull();

        await login({ email: 'user@test.local', password: 'correctpassword' });

        const after = await db.select().from(schema.users).limit(1);
        expect(after[0].lastLoginAt).toBeInstanceOf(Date);
    });

    it('отклоняет неверный пароль с тем же кодом, что и неизвестный email (без enumeration)', async () => {
        const wrongPass = await login({ email: 'user@test.local', password: 'wrongpass' });
        const unknown = await login({ email: 'nobody@test.local', password: 'anything' });

        expect(wrongPass.ok).toBe(false);
        expect(unknown.ok).toBe(false);
        if (wrongPass.ok || unknown.ok) return;
        expect(wrongPass.code).toBe('INVALID_CREDENTIALS');
        expect(unknown.code).toBe('INVALID_CREDENTIALS');
        expect(wrongPass.error).toBe(unknown.error);
    });
});

describe('requestMagicLink', () => {
    it('отправляет письмо если email зарегистрирован', async () => {
        await register({ email: 'a@b.c', password: 'goodpass1', name: 'A', phone: '+79991234567' });
        await new Promise((r) => setImmediate(r));
        mockSendMagic.mockReset();

        const result = await requestMagicLink('a@b.c');
        expect(result.ok).toBe(true);
        expect(mockSendMagic).toHaveBeenCalledOnce();
    });

    it('возвращает ok без отправки для неизвестного email (защита от enumeration)', async () => {
        const result = await requestMagicLink('unknown@test.local');
        expect(result.ok).toBe(true);
        expect(mockSendMagic).not.toHaveBeenCalled();
    });

    it('отклоняет некорректный email', async () => {
        const result = await requestMagicLink('not-an-email');
        expect(result.ok).toBe(false);
    });
});

describe('consumeMagicLink', () => {
    async function setupMagicLink(): Promise<string> {
        await register({ email: 'a@b.c', password: 'goodpass1', name: 'A', phone: '+79991234567' });
        await new Promise((r) => setImmediate(r));
        mockSendMagic.mockReset();
        await requestMagicLink('a@b.c');
        const callArgs = mockSendMagic.mock.calls[0];
        return callArgs[1]; // второй аргумент — raw token
    }

    it('логинит пользователя и подтверждает email', async () => {
        const token = await setupMagicLink();
        const result = await consumeMagicLink(token);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.isEmailVerified).toBe(true);

        const [stored] = await db.select().from(schema.users).limit(1);
        expect(stored.isEmailVerified).toBe(true);
        expect(stored.lastLoginAt).toBeInstanceOf(Date);
    });

    it('нельзя использовать один токен дважды', async () => {
        const token = await setupMagicLink();
        const first = await consumeMagicLink(token);
        const second = await consumeMagicLink(token);

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(false);
        if (second.ok) return;
        expect(second.code).toBe('INVALID_TOKEN');
    });

    it('отклоняет токен другого типа (verify подсунут как magic)', async () => {
        await register({ email: 'a@b.c', password: 'goodpass1', name: 'A', phone: '+79991234567' });
        await new Promise((r) => setImmediate(r));
        const verifyToken = mockSendVerify.mock.calls[0][1];

        const result = await consumeMagicLink(verifyToken);
        expect(result.ok).toBe(false);
    });

    it('отклоняет просроченный токен', async () => {
        const token = await setupMagicLink();
        // вручную помечаем как просроченный
        await db
            .update(schema.emailTokens)
            .set({ expiresAt: new Date(Date.now() - 1000) })
            .where(eq(schema.emailTokens.tokenHash, sha256(token)));

        const result = await consumeMagicLink(token);
        expect(result.ok).toBe(false);
    });
});

describe('verifyEmail', () => {
    it('помечает email как подтверждённый', async () => {
        await register({ email: 'a@b.c', password: 'goodpass1', name: 'A', phone: '+79991234567' });
        await new Promise((r) => setImmediate(r));
        const token = mockSendVerify.mock.calls[0][1];

        const result = await verifyEmail(token);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.isEmailVerified).toBe(true);
    });

    it('одноразовый — повторное использование отклоняется', async () => {
        await register({ email: 'a@b.c', password: 'goodpass1', name: 'A', phone: '+79991234567' });
        await new Promise((r) => setImmediate(r));
        const token = mockSendVerify.mock.calls[0][1];

        await verifyEmail(token);
        const second = await verifyEmail(token);
        expect(second.ok).toBe(false);
    });
});

describe('resendVerification', () => {
    it('отправляет письмо для неподтверждённого юзера', async () => {
        await register({ email: 'a@b.c', password: 'goodpass1', name: 'A', phone: '+79991234567' });
        // register шлёт письмо через void promise — дождёмся до сброса мока
        await new Promise((r) => setImmediate(r));
        mockSendVerify.mockReset();

        const result = await resendVerification('a@b.c');
        expect(result.ok).toBe(true);
        await new Promise((r) => setImmediate(r));
        expect(mockSendVerify).toHaveBeenCalledOnce();
    });

    it('не отправляет повторно если email уже подтверждён', async () => {
        await register({ email: 'a@b.c', password: 'goodpass1', name: 'A', phone: '+79991234567' });
        await new Promise((r) => setImmediate(r));
        const token = mockSendVerify.mock.calls[0][1];
        await verifyEmail(token);
        mockSendVerify.mockReset();

        await resendVerification('a@b.c');
        expect(mockSendVerify).not.toHaveBeenCalled();
    });

    it('возвращает ok для неизвестного email (защита от enumeration)', async () => {
        const result = await resendVerification('unknown@test.local');
        expect(result.ok).toBe(true);
        expect(mockSendVerify).not.toHaveBeenCalled();
    });
});
