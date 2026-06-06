import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
    createSession,
    validateSession,
    invalidateSession,
    invalidateAllUserSessions,
    cleanupExpiredSessions,
    SESSION_TTL_MS,
    SESSION_REFRESH_THRESHOLD_MS,
} from './session';
import { sha256 } from './crypto';

async function makeUser(email = 'a@b.c') {
    const [u] = await db
        .insert(schema.users)
        .values({ email, passwordHash: 'argon2$test', name: 'A', phone: '+70000000000' })
        .returning();
    return u;
}

beforeEach(async () => {
    await db.delete(schema.sessions);
    await db.delete(schema.users);
});

describe('createSession + validateSession', () => {
    it('создаёт сессию и валидирует её', async () => {
        const user = await makeUser();
        const { token, expiresAt } = await createSession({ userId: user.id });

        // expiresAt примерно через TTL
        const drift = Math.abs(expiresAt.getTime() - (Date.now() + SESSION_TTL_MS));
        expect(drift).toBeLessThan(5000);

        const result = await validateSession(token);
        expect(result).not.toBeNull();
        expect(result?.user.id).toBe(user.id);
    });

    it('в БД хранится hash(token), не сам token', async () => {
        const user = await makeUser();
        const { token } = await createSession({ userId: user.id });

        const [stored] = await db.select().from(schema.sessions).limit(1);
        expect(stored.id).toBe(sha256(token));
        expect(stored.id).not.toBe(token);
    });

    it('записывает userAgent и ip', async () => {
        const user = await makeUser();
        await createSession({
            userId: user.id,
            userAgent: 'TestAgent/1.0',
            ip: '10.0.0.1',
        });

        const [stored] = await db.select().from(schema.sessions).limit(1);
        expect(stored.userAgent).toBe('TestAgent/1.0');
        expect(stored.ip).toBe('10.0.0.1');
    });
});

describe('validateSession', () => {
    it('возвращает null для неизвестного токена', async () => {
        const result = await validateSession('definitely-not-a-real-token');
        expect(result).toBeNull();
    });

    it('возвращает null и удаляет сессию если она просрочена', async () => {
        const user = await makeUser();
        const { token } = await createSession({ userId: user.id });

        // сделаем просроченной
        await db
            .update(schema.sessions)
            .set({ expiresAt: new Date(Date.now() - 1000) })
            .where(eq(schema.sessions.id, sha256(token)));

        const result = await validateSession(token);
        expect(result).toBeNull();

        const remaining = await db.select().from(schema.sessions);
        expect(remaining).toHaveLength(0);
    });

    it('продлевает срок если остаётся <REFRESH_THRESHOLD', async () => {
        const user = await makeUser();
        const { token } = await createSession({ userId: user.id });

        // выставим срок на 1 день вперёд — попадает в окно refresh (<7 дней)
        const oneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db
            .update(schema.sessions)
            .set({ expiresAt: oneDay })
            .where(eq(schema.sessions.id, sha256(token)));

        await validateSession(token);

        const [refreshed] = await db.select().from(schema.sessions).limit(1);
        const msRemaining = refreshed.expiresAt.getTime() - Date.now();
        // должно стать ~TTL (30 дней), не 1 день
        expect(msRemaining).toBeGreaterThan(SESSION_REFRESH_THRESHOLD_MS);
    });

    it('НЕ продлевает срок если остаётся достаточно', async () => {
        const user = await makeUser();
        const { token, expiresAt: original } = await createSession({ userId: user.id });

        await validateSession(token);

        const [stored] = await db.select().from(schema.sessions).limit(1);
        // время expiresAt не должно сдвинуться больше чем на несколько мс
        const drift = Math.abs(stored.expiresAt.getTime() - original.getTime());
        expect(drift).toBeLessThan(1000);
    });
});

describe('invalidateSession', () => {
    it('удаляет сессию, повторная валидация даёт null', async () => {
        const user = await makeUser();
        const { token } = await createSession({ userId: user.id });

        await invalidateSession(token);
        const result = await validateSession(token);
        expect(result).toBeNull();
    });
});

describe('invalidateAllUserSessions', () => {
    it('удаляет все сессии конкретного юзера', async () => {
        const u1 = await makeUser('a@test.local');
        const u2 = await makeUser('b@test.local');

        await createSession({ userId: u1.id });
        await createSession({ userId: u1.id });
        await createSession({ userId: u2.id });

        await invalidateAllUserSessions(u1.id);

        const remaining = await db.select().from(schema.sessions);
        expect(remaining).toHaveLength(1);
        expect(remaining[0].userId).toBe(u2.id);
    });
});

describe('cleanupExpiredSessions', () => {
    it('удаляет только просроченные', async () => {
        const user = await makeUser();
        const { token: alive } = await createSession({ userId: user.id });
        const { token: dead } = await createSession({ userId: user.id });

        await db
            .update(schema.sessions)
            .set({ expiresAt: new Date(Date.now() - 1000) })
            .where(eq(schema.sessions.id, sha256(dead)));

        await cleanupExpiredSessions();

        const remaining = await db.select().from(schema.sessions);
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe(sha256(alive));
    });
});
