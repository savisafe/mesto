import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

vi.mock('server-only', () => ({}));

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sha256 } from './crypto';
import {
    authenticateBearer,
    generateApiKey,
    hasScope,
    parseBearer,
    type ApiKeyScope,
} from './api-auth';

async function makeBusiness() {
    const [owner] = await db
        .insert(schema.users)
        .values({ email: `o${Math.random()}@t.local`, passwordHash: 'x', name: 'Owner' })
        .returning();
    const [biz] = await db
        .insert(schema.businesses)
        .values({ name: 'Biz', ownerId: owner.id })
        .returning();
    return biz;
}

async function makeKey(
    businessId: string,
    scopes: ApiKeyScope[] = ['availability:read', 'bookings:write', 'clients:write'],
    opts: { revoked?: boolean } = {},
) {
    const { raw, hash } = generateApiKey();
    await db.insert(schema.apiKeys).values({
        businessId,
        name: 'bot',
        keyHash: hash,
        scopes,
        revokedAt: opts.revoked ? new Date() : null,
    });
    return raw;
}

beforeEach(async () => {
    await db.delete(schema.apiKeys);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
});

describe('generateApiKey', () => {
    it('raw имеет префикс mst_live_, hash = sha256(raw), ключи уникальны', () => {
        const a = generateApiKey();
        const b = generateApiKey();
        expect(a.raw.startsWith('mst_live_')).toBe(true);
        expect(a.hash).toBe(sha256(a.raw));
        expect(a.raw).not.toBe(b.raw);
    });
});

describe('parseBearer', () => {
    it('извлекает токен и игнорирует мусор', () => {
        expect(parseBearer('Bearer abc')).toBe('abc');
        expect(parseBearer('bearer  xyz ')).toBe('xyz');
        expect(parseBearer('abc')).toBeNull();
        expect(parseBearer(null)).toBeNull();
        expect(parseBearer('')).toBeNull();
    });
});

describe('authenticateBearer', () => {
    it('валидный ключ → ok с businessId и scopes', async () => {
        const biz = await makeBusiness();
        const raw = await makeKey(biz.id, ['bookings:write']);
        const r = await authenticateBearer(`Bearer ${raw}`);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.ctx.businessId).toBe(biz.id);
        expect(r.ctx.scopes).toEqual(['bookings:write']);
    });

    it('обновляет last_used_at', async () => {
        const biz = await makeBusiness();
        const raw = await makeKey(biz.id);
        await authenticateBearer(`Bearer ${raw}`);
        const [row] = await db
            .select()
            .from(schema.apiKeys)
            .where(eq(schema.apiKeys.businessId, biz.id));
        expect(row.lastUsedAt).not.toBeNull();
    });

    it('отозванный ключ → KEY_REVOKED 403', async () => {
        const biz = await makeBusiness();
        const raw = await makeKey(biz.id, ['bookings:write'], { revoked: true });
        const r = await authenticateBearer(`Bearer ${raw}`);
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('KEY_REVOKED');
        expect(r.status).toBe(403);
    });

    it('неизвестный ключ → UNAUTHORIZED 401', async () => {
        const { raw } = generateApiKey();
        const r = await authenticateBearer(`Bearer ${raw}`);
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('UNAUTHORIZED');
        expect(r.status).toBe(401);
    });

    it('нет заголовка / неверный префикс → UNAUTHORIZED', async () => {
        expect((await authenticateBearer(null)).ok).toBe(false);
        expect((await authenticateBearer('Bearer not_a_key')).ok).toBe(false);
    });
});

describe('hasScope', () => {
    it('проверяет наличие скоупа', () => {
        const ctx = { businessId: 'b', keyId: 'k', scopes: ['bookings:write'] as ApiKeyScope[] };
        expect(hasScope(ctx, 'bookings:write')).toBe(true);
        expect(hasScope(ctx, 'clients:write')).toBe(false);
    });
});
