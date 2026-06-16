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
import { toPublicUser, type PublicUser, type AppointmentStatus } from '@/db/schema';
import { getFinanceAnalytics } from './finance';

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

async function makeClient(businessId: string, name = 'Client', phone = '+71111111111') {
    const [c] = await db.insert(schema.clients).values({ businessId, name, phone }).returning();
    return c;
}

async function makeAppointment(opts: {
    businessId: string;
    clientId: string;
    employeeUserId?: string | null;
    startsAt: Date;
    durationMin?: number;
    amount: number;
    status: AppointmentStatus;
}) {
    const endsAt = new Date(opts.startsAt.getTime() + (opts.durationMin ?? 60) * 60_000);
    const [a] = await db
        .insert(schema.appointments)
        .values({
            businessId: opts.businessId,
            clientId: opts.clientId,
            employeeUserId: opts.employeeUserId ?? null,
            startsAt: opts.startsAt,
            endsAt,
            amount: opts.amount,
            currency: 'KZT',
            status: opts.status,
        })
        .returning();
    return a;
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

describe('getFinanceAnalytics', () => {
    it('UNAUTHORIZED без сессии', async () => {
        const r = await getFinanceAnalytics({
            businessId: '00000000-0000-0000-0000-000000000000',
            fromDate: '2026-06-01',
            toDate: '2026-06-30',
            granularity: 'month',
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('UNAUTHORIZED');
    });

    it('FORBIDDEN если бизнес чужой', async () => {
        const owner = await makeUser('o@test.local');
        const other = await makeUser('x@test.local');
        const biz = await makeBusiness(owner.id);
        await loginAs(other);
        const r = await getFinanceAnalytics({
            businessId: biz.id,
            fromDate: '2026-06-01',
            toDate: '2026-06-30',
            granularity: 'month',
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('FORBIDDEN');
    });

    it('FORBIDDEN для сотрудника (EMPLOYEE): выручка только владельцу/менеджеру', async () => {
        const owner = await makeUser('o@test.local');
        const emp = await makeUser('emp@test.local');
        const biz = await makeBusiness(owner.id);
        await db.insert(schema.businessMembers).values({
            businessId: biz.id,
            userId: emp.id,
            role: 'EMPLOYEE',
        });
        await loginAs(emp);
        const r = await getFinanceAnalytics({
            businessId: biz.id,
            fromDate: '2026-06-01',
            toDate: '2026-06-30',
            granularity: 'month',
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('FORBIDDEN');
    });

    it('разрешено менеджеру (MANAGER)', async () => {
        const owner = await makeUser('o@test.local');
        const mgr = await makeUser('m@test.local');
        const biz = await makeBusiness(owner.id);
        await db.insert(schema.businessMembers).values({
            businessId: biz.id,
            userId: mgr.id,
            role: 'MANAGER',
        });
        await loginAs(mgr);
        const r = await getFinanceAnalytics({
            businessId: biz.id,
            fromDate: '2026-06-01',
            toDate: '2026-06-30',
            granularity: 'month',
        });
        expect(r.ok).toBe(true);
    });

    it('считает выручку только по завершённым записям', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);

        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date('2026-06-10T09:00:00Z'),
            amount: 5000,
            status: 'completed',
        });
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date('2026-06-11T09:00:00Z'),
            amount: 3000,
            status: 'completed',
        });
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date('2026-06-12T09:00:00Z'),
            amount: 7000,
            status: 'scheduled',
        });
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date('2026-06-13T09:00:00Z'),
            amount: 4000,
            status: 'cancelled',
        });

        await loginAs(owner);
        const r = await getFinanceAnalytics({
            businessId: biz.id,
            fromDate: '2026-06-01',
            toDate: '2026-06-30',
            granularity: 'month',
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.summary.revenue).toBe(8000);
        expect(r.data.summary.pending).toBe(7000);
        expect(r.data.summary.lost).toBe(4000);
        expect(r.data.summary.completedCount).toBe(2);
        expect(r.data.summary.avgCheck).toBe(4000);
        expect(r.data.byStatus).toEqual({
            completed: 2,
            scheduled: 1,
            cancelled: 1,
            no_show: 0,
        });
    });

    it('исключает записи вне диапазона', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);

        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date('2026-05-31T09:00:00Z'),
            amount: 9999,
            status: 'completed',
        });
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date('2026-06-15T09:00:00Z'),
            amount: 5000,
            status: 'completed',
        });

        await loginAs(owner);
        const r = await getFinanceAnalytics({
            businessId: biz.id,
            fromDate: '2026-06-01',
            toDate: '2026-06-30',
            granularity: 'month',
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.summary.revenue).toBe(5000);
    });

    it('фильтрует по сотруднику и строит разбивку', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        const emp = await makeUser('emp@test.local');
        await db.insert(schema.businessMembers).values({
            businessId: biz.id,
            userId: emp.id,
            role: 'EMPLOYEE',
        });

        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: new Date('2026-06-10T09:00:00Z'),
            amount: 5000,
            status: 'completed',
        });
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: emp.id,
            startsAt: new Date('2026-06-10T11:00:00Z'),
            amount: 3000,
            status: 'completed',
        });

        await loginAs(owner);
        const all = await getFinanceAnalytics({
            businessId: biz.id,
            fromDate: '2026-06-01',
            toDate: '2026-06-30',
            granularity: 'month',
        });
        expect(all.ok).toBe(true);
        if (!all.ok) return;
        expect(all.data.summary.revenue).toBe(8000);
        expect(all.data.byEmployee).toHaveLength(2);

        const onlyEmp = await getFinanceAnalytics({
            businessId: biz.id,
            fromDate: '2026-06-01',
            toDate: '2026-06-30',
            granularity: 'month',
            employeeUserId: emp.id,
        });
        expect(onlyEmp.ok).toBe(true);
        if (!onlyEmp.ok) return;
        expect(onlyEmp.data.summary.revenue).toBe(3000);
        expect(onlyEmp.data.byEmployee).toHaveLength(1);
    });

    it('считает прошедшие scheduled как неподтверждённые', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);

        const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        const fromDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
        const toDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: past,
            amount: 5000,
            status: 'scheduled',
        });
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: future,
            amount: 5000,
            status: 'scheduled',
        });

        await loginAs(owner);
        const r = await getFinanceAnalytics({
            businessId: biz.id,
            fromDate,
            toDate,
            granularity: 'custom',
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.summary.unconfirmed).toBe(1);
    });
});
