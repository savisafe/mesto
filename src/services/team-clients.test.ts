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
import { getClientsByEmployee } from './team-clients';

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

describe('getClientsByEmployee', () => {
    it('UNAUTHORIZED без сессии', async () => {
        const r = await getClientsByEmployee('00000000-0000-0000-0000-000000000000');
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('UNAUTHORIZED');
    });

    it('FORBIDDEN для EMPLOYEE (видит выручку — только владелец/менеджер)', async () => {
        const owner = await makeUser('o@test.local');
        const worker = await makeUser('w@test.local');
        const biz = await makeBusiness(owner.id);
        await addMember(biz.id, worker.id, 'EMPLOYEE');

        await loginAs(worker);
        const r = await getClientsByEmployee(biz.id);
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('FORBIDDEN');
    });

    it('менеджер имеет доступ', async () => {
        const owner = await makeUser('o@test.local');
        const manager = await makeUser('m@test.local');
        const biz = await makeBusiness(owner.id);
        await addMember(biz.id, manager.id, 'MANAGER');

        await loginAs(manager);
        const r = await getClientsByEmployee(biz.id);
        expect(r.ok).toBe(true);
    });

    it('группирует клиентов по сотруднику, считает визиты/выручку только по завершённым', async () => {
        const owner = await makeUser('owner@test.local');
        const master = await makeUser('master@test.local');
        const biz = await makeBusiness(owner.id);
        await addMember(biz.id, master.id, 'EMPLOYEE');
        const clientA = await makeClient(biz.id, 'Анна', '+71111111111');

        // 2 завершённых + 1 отменённая (не считается) + 1 запланированная (визит не засчитан).
        await makeAppointment({
            businessId: biz.id,
            clientId: clientA.id,
            employeeUserId: master.id,
            startsAt: new Date('2026-06-01T09:00:00Z'),
            amount: 5000,
            status: 'completed',
        });
        await makeAppointment({
            businessId: biz.id,
            clientId: clientA.id,
            employeeUserId: master.id,
            startsAt: new Date('2026-06-10T09:00:00Z'),
            amount: 3000,
            status: 'completed',
        });
        await makeAppointment({
            businessId: biz.id,
            clientId: clientA.id,
            employeeUserId: master.id,
            startsAt: new Date('2026-06-20T09:00:00Z'),
            amount: 9999,
            status: 'cancelled',
        });
        await makeAppointment({
            businessId: biz.id,
            clientId: clientA.id,
            employeeUserId: master.id,
            startsAt: new Date('2026-07-01T09:00:00Z'),
            amount: 4000,
            status: 'scheduled',
        });

        await loginAs(owner);
        const r = await getClientsByEmployee(biz.id);
        expect(r.ok).toBe(true);
        if (!r.ok) return;

        const masterGroup = r.data.find((g) => g.employee?.id === master.id);
        expect(masterGroup).toBeDefined();
        expect(masterGroup!.clients).toHaveLength(1);
        const row = masterGroup!.clients[0];
        expect(row.visits).toBe(2);
        expect(row.revenue).toBe(8000);
        expect(row.lastVisitAt?.toISOString()).toBe('2026-06-10T09:00:00.000Z');
        expect(row.otherEmployees).toBe(false);

        // Владелец без клиентов — присутствует как пустая группа.
        const ownerGroup = r.data.find((g) => g.employee?.id === owner.id);
        expect(ownerGroup).toBeDefined();
        expect(ownerGroup!.clients).toHaveLength(0);
    });

    it('помечает otherEmployees, когда клиент ходит к нескольким сотрудникам', async () => {
        const owner = await makeUser('owner@test.local');
        const master = await makeUser('master@test.local');
        const biz = await makeBusiness(owner.id);
        await addMember(biz.id, master.id, 'EMPLOYEE');
        const client = await makeClient(biz.id, 'Борис', '+72222222222');

        // Один клиент у владельца и у мастера.
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: new Date('2026-06-01T09:00:00Z'),
            amount: 1000,
            status: 'completed',
        });
        await makeAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: master.id,
            startsAt: new Date('2026-06-02T09:00:00Z'),
            amount: 2000,
            status: 'completed',
        });

        await loginAs(owner);
        const r = await getClientsByEmployee(biz.id);
        expect(r.ok).toBe(true);
        if (!r.ok) return;

        const ownerRow = r.data.find((g) => g.employee?.id === owner.id)?.clients[0];
        const masterRow = r.data.find((g) => g.employee?.id === master.id)?.clients[0];
        expect(ownerRow?.otherEmployees).toBe(true);
        expect(masterRow?.otherEmployees).toBe(true);
    });

    it('записи без сотрудника попадают в группу «Без сотрудника» (employee=null)', async () => {
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
        const r = await getClientsByEmployee(biz.id);
        expect(r.ok).toBe(true);
        if (!r.ok) return;

        const unassigned = r.data.find((g) => g.employee === null);
        expect(unassigned).toBeDefined();
        expect(unassigned!.clients[0].client.name).toBe('Вера');
        expect(unassigned!.clients[0].visits).toBe(1);
    });
});
