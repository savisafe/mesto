import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

vi.mock('@/lib/auth', () => ({
    getCurrentUser: vi.fn(),
}));

import { db } from '@/db';
import * as schema from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import {
    toPublicUser,
    type PublicUser,
    type AppointmentStatus,
    type BusinessMemberRole,
} from '@/db/schema';
import { getClientStats } from './team-clients';

const mockGetCurrentUser = vi.mocked(getCurrentUser);

async function makeUser(email: string): Promise<PublicUser> {
    const [u] = await db
        .insert(schema.users)
        .values({ email, passwordHash: 'argon2$test', name: email, phone: '+70000000000' })
        .returning();
    return toPublicUser(u);
}

async function makeBusiness(ownerId: string, name = 'Biz') {
    const [b] = await db
        .insert(schema.businesses)
        .values({ name, ownerId, timezone: 'UTC' })
        .returning();
    return b;
}

async function addMember(businessId: string, userId: string, role: BusinessMemberRole) {
    await db.insert(schema.businessMembers).values({ businessId, userId, role });
}

async function makeClient(businessId: string, name: string, phone: string) {
    const [c] = await db.insert(schema.clients).values({ businessId, name, phone }).returning();
    return c;
}

async function makeAppointment(opts: {
    businessId: string;
    clientId: string;
    employeeUserId?: string | null;
    startsAt: Date;
    amount: number;
    status: AppointmentStatus;
}) {
    const endsAt = new Date(opts.startsAt.getTime() + 60 * 60_000);
    await db.insert(schema.appointments).values({
        businessId: opts.businessId,
        clientId: opts.clientId,
        employeeUserId: opts.employeeUserId ?? null,
        startsAt: opts.startsAt,
        endsAt,
        amount: opts.amount,
        currency: 'KZT',
        status: opts.status,
    });
}

async function loginAs(user: PublicUser) {
    mockGetCurrentUser.mockResolvedValue(user);
}

beforeEach(async () => {
    await db.delete(schema.appointments);
    await db.delete(schema.clients);
    await db.delete(schema.businessMembers);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue(null);
});

describe('getClientStats', () => {
    it('UNAUTHORIZED без сессии', async () => {
        const r = await getClientStats(
            '00000000-0000-0000-0000-000000000000',
            '00000000-0000-0000-0000-000000000000',
        );
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('UNAUTHORIZED');
    });

    it('FORBIDDEN для участников — статистика только у владельца', async () => {
        const owner = await makeUser('o@test.local');
        const employee = await makeUser('e@test.local');
        const manager = await makeUser('m@test.local');
        const biz = await makeBusiness(owner.id);
        await addMember(biz.id, employee.id, 'EMPLOYEE');
        await addMember(biz.id, manager.id, 'MANAGER');
        const client = await makeClient(biz.id, 'Анна', '+71111111111');

        for (const u of [employee, manager]) {
            await loginAs(u);
            const r = await getClientStats(biz.id, client.id);
            expect(r.ok).toBe(false);
            if (r.ok) return;
            expect(r.code).toBe('FORBIDDEN');
        }
    });

    it('владелец имеет доступ', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id, 'Анна', '+71111111111');
        await loginAs(owner);
        const r = await getClientStats(biz.id, client.id);
        expect(r.ok).toBe(true);
    });

    it('NOT_FOUND для чужого клиента', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        await loginAs(owner);
        const r = await getClientStats(biz.id, '00000000-0000-0000-0000-000000000000');
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('NOT_FOUND');
    });

    it('считает итого и разрез по сотрудникам только по завершённым', async () => {
        const owner = await makeUser('owner@test.local');
        const master = await makeUser('master@test.local');
        const biz = await makeBusiness(owner.id);
        await addMember(biz.id, master.id, 'EMPLOYEE');
        const client = await makeClient(biz.id, 'Анна', '+71111111111');

        // У мастера: 2 завершённых (5000 + 3000), 1 отменённая (не в счёт), 1 будущая.
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: master.id,
            startsAt: new Date('2026-06-01T09:00:00Z'),
            amount: 5000,
            status: 'completed',
        });
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: master.id,
            startsAt: new Date('2026-06-10T09:00:00Z'),
            amount: 3000,
            status: 'completed',
        });
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: master.id,
            startsAt: new Date('2026-06-20T09:00:00Z'),
            amount: 9999,
            status: 'cancelled',
        });
        // У владельца: 1 завершённая (2000).
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: new Date('2026-06-15T09:00:00Z'),
            amount: 2000,
            status: 'completed',
        });

        await loginAs(owner);
        const r = await getClientStats(biz.id, client.id);
        expect(r.ok).toBe(true);
        if (!r.ok) return;

        expect(r.data.client.name).toBe('Анна');
        expect(r.data.totalVisits).toBe(3);
        expect(r.data.totalRevenue).toBe(10000);
        expect(r.data.lastVisitAt?.toISOString()).toBe('2026-06-15T09:00:00.000Z');

        // Разрез по сотрудникам — оба сотрудника.
        expect(r.data.byEmployee).toHaveLength(2);
        const masterStat = r.data.byEmployee.find((e) => e.employee?.id === master.id);
        expect(masterStat?.visits).toBe(2);
        expect(masterStat?.revenue).toBe(8000);
    });

    it('записи без сотрудника попадают в строку employee=null', async () => {
        const owner = await makeUser('owner@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id, 'Вера', '+73333333333');
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: null,
            startsAt: new Date('2026-06-01T09:00:00Z'),
            amount: 1500,
            status: 'completed',
        });

        await loginAs(owner);
        const r = await getClientStats(biz.id, client.id);
        expect(r.ok).toBe(true);
        if (!r.ok) return;

        expect(r.data.totalVisits).toBe(1);
        expect(r.data.byEmployee).toHaveLength(1);
        expect(r.data.byEmployee[0].employee).toBeNull();
    });
});
