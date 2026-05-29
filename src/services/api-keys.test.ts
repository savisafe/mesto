import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { toPublicUser, type PublicUser } from '@/db/schema';
import { sha256 } from '@/lib/crypto';
import { listApiKeys, createApiKey, revokeApiKey } from './api-keys';

const mockGetCurrentUser = vi.mocked(getCurrentUser);

async function makeUser(email: string): Promise<PublicUser> {
    const [u] = await db
        .insert(schema.users)
        .values({ email, passwordHash: 'x', name: email })
        .returning();
    return toPublicUser(u);
}

async function makeBusiness(ownerId: string) {
    const [b] = await db.insert(schema.businesses).values({ name: 'Biz', ownerId }).returning();
    return b;
}

beforeEach(async () => {
    await db.delete(schema.apiKeys);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue(null);
});

describe('createApiKey', () => {
    it('UNAUTHORIZED без сессии', async () => {
        const r = await createApiKey({ businessId: 'x', name: 'bot' });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('UNAUTHORIZED');
    });

    it('FORBIDDEN для не-владельца', async () => {
        const owner = await makeUser('o@t.local');
        const other = await makeUser('x@t.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(other);
        const r = await createApiKey({ businessId: biz.id, name: 'bot' });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('FORBIDDEN');
    });

    it('создаёт ключ: rawKey с префиксом, в БД хранится sha256(raw)', async () => {
        const owner = await makeUser('o@t.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(owner);
        const r = await createApiKey({ businessId: biz.id, name: 'tg-bot' });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.rawKey.startsWith('mst_live_')).toBe(true);
        expect(r.data.scopes.length).toBe(4);
        const [row] = await db
            .select()
            .from(schema.apiKeys)
            .where(eq(schema.apiKeys.id, r.data.id));
        expect(row.keyHash).toBe(sha256(r.data.rawKey));
        expect(row.name).toBe('tg-bot');
    });

    it('кастомные scopes сохраняются', async () => {
        const owner = await makeUser('o@t.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(owner);
        const r = await createApiKey({ businessId: biz.id, name: 'ro', scopes: ['availability:read'] });
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.data.scopes).toEqual(['availability:read']);
    });
});

describe('listApiKeys / revokeApiKey', () => {
    it('список активных, revoke убирает из списка (идемпотентно)', async () => {
        const owner = await makeUser('o@t.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(owner);

        const created = await createApiKey({ businessId: biz.id, name: 'bot' });
        if (!created.ok) throw new Error('setup');

        const before = await listApiKeys(biz.id);
        expect(before.ok && before.data).toHaveLength(1);

        const rev = await revokeApiKey(created.data.id);
        expect(rev.ok).toBe(true);

        const after = await listApiKeys(biz.id);
        expect(after.ok && after.data).toHaveLength(0);

        // повторный revoke — без ошибки
        const rev2 = await revokeApiKey(created.data.id);
        expect(rev2.ok).toBe(true);
    });
});
