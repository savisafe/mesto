import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

import { db } from '@/db';
import * as schema from '@/db/schema';
import { getDashboardStats } from './dashboard';

async function makeOwner(email: string): Promise<string> {
    const [user] = await db
        .insert(schema.users)
        .values({
            email,
            passwordHash: 'argon2$test',
            name: email,
            role: 'OWNER',
            phone: '+70000000000',
        })
        .returning();
    return user.id;
}

async function makeBusiness(
    ownerId: string,
    opts: { name: string; isActive?: boolean; archived?: boolean },
): Promise<string> {
    const [biz] = await db
        .insert(schema.businesses)
        .values({
            name: opts.name,
            ownerId,
            isActive: opts.isActive ?? true,
            archivedAt: opts.archived ? new Date() : null,
        })
        .returning();
    return biz.id;
}

async function resetAll() {
    await db.delete(schema.appointments);
    await db.delete(schema.clients);
    await db.delete(schema.businessMembers);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
}

beforeEach(async () => {
    await resetAll();
});

describe('getDashboardStats — только активные бизнесы', () => {
    it('исключает архивные и неактивные бизнесы из списка', async () => {
        const ownerId = await makeOwner('owner@test.dev');
        const active = await makeBusiness(ownerId, { name: 'Активный' });
        await makeBusiness(ownerId, { name: 'Неактивный', isActive: false });
        await makeBusiness(ownerId, { name: 'Архивный', archived: true });

        const stats = await getDashboardStats(ownerId);

        expect(stats.businesses).toHaveLength(1);
        expect(stats.businesses[0].id).toBe(active);
        expect(stats.businesses[0].name).toBe('Активный');
    });

    it('счётчики агрегируются только по активным бизнесам', async () => {
        const ownerId = await makeOwner('owner2@test.dev');
        const active = await makeBusiness(ownerId, { name: 'Активный' });
        const inactive = await makeBusiness(ownerId, { name: 'Неактивный', isActive: false });

        // Клиент в активном бизнесе должен учитываться, в неактивном — нет.
        const [activeClient] = await db
            .insert(schema.clients)
            .values({ businessId: active, name: 'Клиент A', phone: '+70000000001' })
            .returning();
        await db
            .insert(schema.clients)
            .values({ businessId: inactive, name: 'Клиент B', phone: '+70000000002' });

        await db.insert(schema.appointments).values({
            businessId: active,
            clientId: activeClient.id,
            startsAt: new Date(),
            endsAt: new Date(Date.now() + 3600_000),
            status: 'scheduled',
        });
        // Запись в неактивном бизнесе не учитывается.
        const [inactiveClient] = await db
            .insert(schema.clients)
            .values({ businessId: inactive, name: 'Клиент C', phone: '+70000000003' })
            .returning();
        await db.insert(schema.appointments).values({
            businessId: inactive,
            clientId: inactiveClient.id,
            startsAt: new Date(),
            endsAt: new Date(Date.now() + 3600_000),
            status: 'scheduled',
        });

        const stats = await getDashboardStats(ownerId);

        expect(stats.totalClients).toBe(1);
        expect(stats.scheduledAppointments).toBe(1);
    });

    it('возвращает пустую сводку, когда активных бизнесов нет', async () => {
        const ownerId = await makeOwner('owner3@test.dev');
        await makeBusiness(ownerId, { name: 'Архивный', archived: true });

        const stats = await getDashboardStats(ownerId);

        expect(stats.businesses).toHaveLength(0);
        expect(stats.totalClients).toBe(0);
        expect(stats.totalMembers).toBe(0);
        expect(stats.scheduledAppointments).toBe(0);
    });
});
