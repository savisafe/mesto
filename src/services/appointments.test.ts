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
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { toPublicUser, type PublicUser } from '@/db/schema';
import {
    listAppointments,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    addMinutes,
} from './appointments';

const mockGetCurrentUser = vi.mocked(getCurrentUser);

async function makeUser(email: string): Promise<PublicUser> {
    const [u] = await db
        .insert(schema.users)
        .values({ email, passwordHash: 'argon2$test', name: email, phone: '+70000000000' })
        .returning();
    return toPublicUser(u);
}

async function makeBusiness(ownerId: string, name = 'Biz') {
    const [b] = await db.insert(schema.businesses).values({ name, ownerId }).returning();
    return b;
}

async function makeClient(businessId: string, name = 'Client A', phone = '+71111111111') {
    const [c] = await db
        .insert(schema.clients)
        .values({ businessId, name, phone })
        .returning();
    return c;
}

async function makeService(businessId: string, durationMinutes = 60, amount = 5000) {
    const [s] = await db
        .insert(schema.services)
        .values({ businessId, name: 'Маникюр', durationMinutes, amount, currency: 'KZT' })
        .returning();
    return s;
}

async function makeSchedule(
    businessId: string,
    weekday: number,
    startMinute: number,
    endMinute: number,
    employeeUserId: string | null = null,
) {
    await db
        .insert(schema.workSchedules)
        .values({ businessId, employeeUserId, weekday, startMinute, endMinute });
}

async function loginAs(user: PublicUser) {
    mockGetCurrentUser.mockResolvedValue(user);
}

beforeEach(async () => {
    await db.delete(schema.appointments);
    await db.delete(schema.services);
    await db.delete(schema.clients);
    await db.delete(schema.businessMembers);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue(null);
});

describe('доступ по роли: создание записи и видимость телефона', () => {
    it('createAppointment запрещён для EMPLOYEE (FORBIDDEN)', async () => {
        const owner = await makeUser('owner@test.local');
        const employee = await makeUser('emp@test.local');
        const biz = await makeBusiness(owner.id);
        await db
            .insert(schema.businessMembers)
            .values({ businessId: biz.id, userId: employee.id, role: 'EMPLOYEE' });
        const client = await makeClient(biz.id);
        const svc = await makeService(biz.id);

        await loginAs(employee);
        const r = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            serviceId: svc.id,
            startsAt: new Date('2026-06-10T09:00:00Z'),
            durationMinutes: svc.durationMinutes,
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('FORBIDDEN');
    });

    it('listAppointments скрывает телефон клиента от EMPLOYEE, показывает владельцу', async () => {
        const owner = await makeUser('owner@test.local');
        const employee = await makeUser('emp@test.local');
        const biz = await makeBusiness(owner.id);
        await db
            .insert(schema.businessMembers)
            .values({ businessId: biz.id, userId: employee.id, role: 'EMPLOYEE' });
        const client = await makeClient(biz.id, 'Анна', '+79990001122');
        const svc = await makeService(biz.id);

        await loginAs(owner);
        const created = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            serviceId: svc.id,
            startsAt: new Date('2026-06-10T09:00:00Z'),
            durationMinutes: svc.durationMinutes,
        });
        expect(created.ok).toBe(true);

        const window = {
            businessId: biz.id,
            from: new Date('2026-06-10T00:00:00Z'),
            to: new Date('2026-06-11T00:00:00Z'),
        };

        await loginAs(owner);
        const asOwner = await listAppointments(window);
        expect(asOwner.ok).toBe(true);
        if (!asOwner.ok) return;
        expect(asOwner.data[0].client.phone).toBe('+79990001122');

        await loginAs(employee);
        const asEmployee = await listAppointments(window);
        expect(asEmployee.ok).toBe(true);
        if (!asEmployee.ok) return;
        expect(asEmployee.data[0].client.phone).toBe('');
        // Имя при этом остаётся видимым.
        expect(asEmployee.data[0].client.name).toBe('Анна');
    });
});

describe('createAppointment', () => {
    it('UNAUTHORIZED без сессии', async () => {
        const r = await createAppointment({
            businessId: '00000000-0000-0000-0000-000000000000',
            clientId: '00000000-0000-0000-0000-000000000000',
            startsAt: new Date(),
            durationMinutes: 30,
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('UNAUTHORIZED');
    });

    it('FORBIDDEN если бизнес чужой', async () => {
        const owner = await makeUser('o@test.local');
        const other = await makeUser('x@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);

        await loginAs(other);
        const r = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date(),
            durationMinutes: 60,
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('FORBIDDEN');
    });

    it('INVALID_CLIENT если клиент из другого бизнеса', async () => {
        const owner = await makeUser('o@test.local');
        const biz1 = await makeBusiness(owner.id, 'A');
        const biz2 = await makeBusiness(owner.id, 'B');
        const clientOfBiz2 = await makeClient(biz2.id);

        await loginAs(owner);
        const r = await createAppointment({
            businessId: biz1.id,
            clientId: clientOfBiz2.id,
            startsAt: new Date(),
            durationMinutes: 60,
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('INVALID_CLIENT');
    });

    it('успех — копирует цену из услуги если amount не передан', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        const service = await makeService(biz.id, 60, 7500);

        await loginAs(owner);
        const startsAt = new Date('2026-06-01T10:00:00Z');
        const r = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            serviceId: service.id,
            startsAt,
            durationMinutes: 60,
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.amount).toBe(7500);
        expect(r.data.endsAt.getTime()).toBe(startsAt.getTime() + 60 * 60_000);
    });

    it('SLOT_CONFLICT для пересечения у того же мастера', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await loginAs(owner);

        const start = new Date('2026-06-01T10:00:00Z');
        await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: start,
            durationMinutes: 60,
        });

        // полностью внутри
        const r = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: addMinutes(start, 15),
            durationMinutes: 30,
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('SLOT_CONFLICT');
    });

    it('SLOT_CONFLICT для частичного пересечения слева', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await loginAs(owner);

        const start = new Date('2026-06-01T10:00:00Z');
        await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: start,
            durationMinutes: 60,
        });

        const r = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: addMinutes(start, -30),
            durationMinutes: 60,
        });
        expect(r.ok).toBe(false);
    });

    it('окно встык (новая начинается ровно когда заканчивается старая) — не конфликт', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await loginAs(owner);

        const start = new Date('2026-06-01T10:00:00Z');
        await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: start,
            durationMinutes: 60,
        });

        const r = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: addMinutes(start, 60),
            durationMinutes: 30,
        });
        expect(r.ok).toBe(true);
    });

    it('cancelled запись не блокирует слот', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await loginAs(owner);

        const start = new Date('2026-06-01T10:00:00Z');
        const first = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: start,
            durationMinutes: 60,
        });
        if (!first.ok) throw new Error('setup failed');

        await cancelAppointment(first.data.id);

        const r = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: addMinutes(start, 15),
            durationMinutes: 30,
        });
        expect(r.ok).toBe(true);
    });

    it('записи у разных мастеров в один слот — не конфликт', async () => {
        const owner = await makeUser('o@test.local');
        const employee = await makeUser('e@test.local');
        const biz = await makeBusiness(owner.id);
        await db
            .insert(schema.businessMembers)
            .values({ businessId: biz.id, userId: employee.id, role: 'EMPLOYEE' });
        const client = await makeClient(biz.id);
        await loginAs(owner);

        const start = new Date('2026-06-01T10:00:00Z');
        const r1 = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: start,
            durationMinutes: 60,
        });
        const r2 = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: employee.id,
            startsAt: start,
            durationMinutes: 60,
        });
        expect(r1.ok).toBe(true);
        expect(r2.ok).toBe(true);
    });

    it('без мастера (employeeUserId=null) — конфликты не проверяются', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await loginAs(owner);

        const start = new Date('2026-06-01T10:00:00Z');
        const r1 = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: start,
            durationMinutes: 60,
        });
        const r2 = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: start,
            durationMinutes: 60,
        });
        expect(r1.ok).toBe(true);
        expect(r2.ok).toBe(true);
    });

    it('INVALID_EMPLOYEE если сотрудник не из этого бизнеса', async () => {
        const owner = await makeUser('o@test.local');
        const stranger = await makeUser('s@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await loginAs(owner);

        const r = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: stranger.id,
            startsAt: new Date('2026-06-01T10:00:00Z'),
            durationMinutes: 60,
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('INVALID_EMPLOYEE');
    });
});

describe('createAppointment — рабочие часы и выходные (validateSlot)', () => {
    // Часовой пояс бизнеса по умолчанию — Asia/Almaty (UTC+5).
    // 2026-06-01 — понедельник (weekday=1), 2026-06-07 — воскресенье (weekday=0).

    it('OUT_OF_HOURS — запись в выходной день (нет окна на этот день недели)', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await makeSchedule(biz.id, 1, 9 * 60, 18 * 60); // только понедельник
        await loginAs(owner);

        // Воскресенье, 10:00 по Almaty.
        const r = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date('2026-06-07T05:00:00Z'),
            durationMinutes: 60,
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('OUT_OF_HOURS');
    });

    it('OUT_OF_HOURS — запись вне рабочих часов в рабочий день', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await makeSchedule(biz.id, 1, 9 * 60, 18 * 60);
        await loginAs(owner);

        // Понедельник, 07:00 по Almaty — до открытия.
        const r = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date('2026-06-01T02:00:00Z'),
            durationMinutes: 60,
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('OUT_OF_HOURS');
    });

    it('успех — запись внутри рабочих часов', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await makeSchedule(biz.id, 1, 9 * 60, 18 * 60);
        await loginAs(owner);

        // Понедельник, 15:00–16:00 по Almaty.
        const r = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date('2026-06-01T10:00:00Z'),
            durationMinutes: 60,
        });
        expect(r.ok).toBe(true);
    });

    it('без настроенного графика — запись разрешена в любое время (обратная совместимость)', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await loginAs(owner);

        // Воскресенье — но графика нет, значит ограничения не применяются.
        const r = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date('2026-06-07T05:00:00Z'),
            durationMinutes: 60,
        });
        expect(r.ok).toBe(true);
    });
});

describe('listAppointments', () => {
    it('фильтрует по окну времени', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await loginAs(owner);

        const day = new Date('2026-06-01T00:00:00Z');
        await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: addMinutes(day, -60),
            durationMinutes: 60,
        });
        await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: day,
            durationMinutes: 60,
        });
        await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: addMinutes(day, 60 * 25),
            durationMinutes: 60,
        });

        const r = await listAppointments({
            businessId: biz.id,
            from: day,
            to: addMinutes(day, 60 * 24),
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data).toHaveLength(1);
    });

    it('фильтрует по сотруднику', async () => {
        const owner = await makeUser('o@test.local');
        const employee = await makeUser('e@test.local');
        const biz = await makeBusiness(owner.id);
        await db
            .insert(schema.businessMembers)
            .values({ businessId: biz.id, userId: employee.id, role: 'EMPLOYEE' });
        const client = await makeClient(biz.id);
        await loginAs(owner);

        const day = new Date('2026-06-01T10:00:00Z');
        await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: day,
            durationMinutes: 60,
        });
        await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: employee.id,
            startsAt: addMinutes(day, 60),
            durationMinutes: 60,
        });

        const r = await listAppointments({
            businessId: biz.id,
            from: day,
            to: addMinutes(day, 60 * 24),
            employeeUserId: employee.id,
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data).toHaveLength(1);
        expect(r.data[0].employee?.id).toBe(employee.id);
    });

    it('подтягивает имена клиента, услуги, сотрудника', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id, 'Анна', '+777');
        const service = await makeService(biz.id);
        await loginAs(owner);

        await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            serviceId: service.id,
            employeeUserId: owner.id,
            startsAt: new Date('2026-06-01T10:00:00Z'),
            durationMinutes: 60,
        });

        const r = await listAppointments({
            businessId: biz.id,
            from: new Date('2026-06-01T00:00:00Z'),
            to: new Date('2026-06-02T00:00:00Z'),
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data[0].client.name).toBe('Анна');
        expect(r.data[0].service?.name).toBe('Маникюр');
        expect(r.data[0].employee?.id).toBe(owner.id);
    });
});

describe('updateAppointment', () => {
    it('SLOT_CONFLICT при переносе на занятый слот того же мастера', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await loginAs(owner);

        const slotA = new Date('2026-06-01T10:00:00Z');
        const slotB = new Date('2026-06-01T12:00:00Z');

        await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: slotA,
            durationMinutes: 60,
        });
        const second = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: slotB,
            durationMinutes: 60,
        });
        if (!second.ok) throw new Error('setup failed');

        const r = await updateAppointment(second.data.id, { startsAt: slotA });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('SLOT_CONFLICT');
    });

    it('перенос на свой же слот не считается конфликтом сам с собой', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await loginAs(owner);

        const start = new Date('2026-06-01T10:00:00Z');
        const created = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: start,
            durationMinutes: 60,
        });
        if (!created.ok) throw new Error('setup failed');

        const r = await updateAppointment(created.data.id, { notes: 'just notes' });
        expect(r.ok).toBe(true);
    });
});

describe('cancelAppointment', () => {
    it('меняет статус на cancelled', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await loginAs(owner);

        const created = await createAppointment({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date('2026-06-01T10:00:00Z'),
            durationMinutes: 60,
        });
        if (!created.ok) throw new Error('setup failed');

        const r = await cancelAppointment(created.data.id);
        expect(r.ok).toBe(true);

        const [stored] = await db
            .select()
            .from(schema.appointments)
            .where(eq(schema.appointments.id, created.data.id));
        expect(stored.status).toBe('cancelled');
    });
});
