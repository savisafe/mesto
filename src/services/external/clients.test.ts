import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../../tests/db');
    const db = await createTestDb();
    return { db };
});

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { findOrCreateClient } from './clients';

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

beforeEach(async () => {
    await db.delete(schema.clients);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
});

describe('findOrCreateClient', () => {
    it('создаёт нового клиента', async () => {
        const biz = await makeBusiness();
        const r = await findOrCreateClient({
            businessId: biz.id,
            name: 'Анна',
            phone: '+77001112233',
            telegramId: '111',
        });
        expect(r.created).toBe(true);
        expect(r.client.telegramId).toBe('111');
    });

    it('дедуп по telegram_id (даже при другом телефоне)', async () => {
        const biz = await makeBusiness();
        const first = await findOrCreateClient({
            businessId: biz.id,
            name: 'Анна',
            phone: '+77001112233',
            telegramId: '111',
        });
        const again = await findOrCreateClient({
            businessId: biz.id,
            name: 'Аня',
            phone: '+79990000000',
            telegramId: '111',
        });
        expect(again.created).toBe(false);
        expect(again.client.id).toBe(first.client.id);
    });

    it('дедуп по телефону и бэкафилл telegram_id', async () => {
        const biz = await makeBusiness();
        const first = await findOrCreateClient({
            businessId: biz.id,
            name: 'Анна',
            phone: '+77001112233',
        });
        expect(first.client.telegramId).toBeNull();

        const again = await findOrCreateClient({
            businessId: biz.id,
            name: 'Анна',
            phone: '+77001112233',
            telegramId: '222',
        });
        expect(again.created).toBe(false);
        expect(again.client.id).toBe(first.client.id);
        const [row] = await db
            .select()
            .from(schema.clients)
            .where(eq(schema.clients.id, first.client.id));
        expect(row.telegramId).toBe('222');
    });

    it('разные бизнесы не пересекаются', async () => {
        const a = await makeBusiness();
        const b = await makeBusiness();
        const inA = await findOrCreateClient({ businessId: a.id, name: 'X', phone: '+700', telegramId: '9' });
        const inB = await findOrCreateClient({ businessId: b.id, name: 'X', phone: '+700', telegramId: '9' });
        expect(inB.created).toBe(true);
        expect(inB.client.id).not.toBe(inA.client.id);
    });
});
