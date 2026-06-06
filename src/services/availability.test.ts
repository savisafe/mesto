import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { getAvailability, validateSlot } from './availability';

dayjs.extend(utc);
dayjs.extend(timezone);

// Понедельник. Бизнес-зона в большинстве тестов — UTC, поэтому локальное время = UTC.
const MONDAY = '2026-06-15';
const weekdayOf = (dateStr: string, tz: string) => dayjs.tz(dateStr, tz).day();
const at = (iso: string) => new Date(iso);

async function makeOwner() {
    const [u] = await db
        .insert(schema.users)
        .values({ email: `o${Math.random()}@t.local`, passwordHash: 'x', name: 'Owner', phone: '+70000000000' })
        .returning();
    return u;
}

async function makeBusiness(ownerId: string, timezone = 'UTC') {
    const [b] = await db
        .insert(schema.businesses)
        .values({ name: 'Biz', ownerId, timezone })
        .returning();
    return b;
}

async function makeClient(businessId: string) {
    const [c] = await db
        .insert(schema.clients)
        .values({ businessId, name: 'Client', phone: '+70000000000' })
        .returning();
    return c;
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

async function makeTimeOff(
    businessId: string,
    startsAt: Date,
    endsAt: Date,
    employeeUserId: string | null = null,
) {
    await db
        .insert(schema.timeOff)
        .values({ businessId, employeeUserId, startsAt, endsAt, reason: 'other' });
}

async function makeAppointment(
    businessId: string,
    clientId: string,
    employeeUserId: string,
    startsAt: Date,
    durationMin: number,
) {
    const [a] = await db
        .insert(schema.appointments)
        .values({
            businessId,
            clientId,
            employeeUserId,
            startsAt,
            endsAt: new Date(startsAt.getTime() + durationMin * 60_000),
        })
        .returning();
    return a;
}

beforeEach(async () => {
    await db.delete(schema.appointments);
    await db.delete(schema.timeOff);
    await db.delete(schema.workSchedules);
    await db.delete(schema.services);
    await db.delete(schema.businessMembers);
    await db.delete(schema.clients);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
});

describe('validateSlot', () => {
    it('permissive: без настроенного графика любое время ok', async () => {
        const owner = await makeOwner();
        const biz = await makeBusiness(owner.id);
        const r = await validateSlot({
            businessId: biz.id,
            employeeUserId: owner.id,
            startsAt: at('2026-06-15T03:00:00Z'),
            durationMinutes: 60,
        });
        expect(r.ok).toBe(true);
    });

    it('OUT_OF_HOURS вне рабочего окна, ok внутри', async () => {
        const owner = await makeOwner();
        const biz = await makeBusiness(owner.id);
        await makeSchedule(biz.id, weekdayOf(MONDAY, 'UTC'), 600, 720); // 10:00–12:00

        const before = await validateSlot({
            businessId: biz.id,
            employeeUserId: null,
            startsAt: at(`${MONDAY}T09:00:00Z`),
            durationMinutes: 60,
        });
        expect(before.ok).toBe(false);
        if (!before.ok) expect(before.code).toBe('OUT_OF_HOURS');

        const inside = await validateSlot({
            businessId: biz.id,
            employeeUserId: null,
            startsAt: at(`${MONDAY}T10:00:00Z`),
            durationMinutes: 60,
        });
        expect(inside.ok).toBe(true);
    });

    it('сотрудник наследует часы бизнеса, если своих нет', async () => {
        const owner = await makeOwner();
        const biz = await makeBusiness(owner.id);
        await makeSchedule(biz.id, weekdayOf(MONDAY, 'UTC'), 600, 720, null);
        const r = await validateSlot({
            businessId: biz.id,
            employeeUserId: owner.id,
            startsAt: at(`${MONDAY}T10:00:00Z`),
            durationMinutes: 60,
        });
        expect(r.ok).toBe(true);
    });

    it('BLOCKED при пересечении с бизнес-блоком', async () => {
        const owner = await makeOwner();
        const biz = await makeBusiness(owner.id);
        await makeSchedule(biz.id, weekdayOf(MONDAY, 'UTC'), 600, 720);
        await makeTimeOff(biz.id, at(`${MONDAY}T10:00:00Z`), at(`${MONDAY}T11:00:00Z`));
        const r = await validateSlot({
            businessId: biz.id,
            employeeUserId: null,
            startsAt: at(`${MONDAY}T10:00:00Z`),
            durationMinutes: 30,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('BLOCKED');
    });

    it('блок сотрудника не трогает бизнес-уровневую запись (employeeUserId=null)', async () => {
        const owner = await makeOwner();
        const biz = await makeBusiness(owner.id);
        await makeSchedule(biz.id, weekdayOf(MONDAY, 'UTC'), 600, 720);
        await makeTimeOff(biz.id, at(`${MONDAY}T10:00:00Z`), at(`${MONDAY}T11:00:00Z`), owner.id);
        const r = await validateSlot({
            businessId: biz.id,
            employeeUserId: null,
            startsAt: at(`${MONDAY}T10:00:00Z`),
            durationMinutes: 30,
        });
        expect(r.ok).toBe(true);
    });

    it('SLOT_CONFLICT при пересечении записи того же мастера; exclude игнорирует свою', async () => {
        const owner = await makeOwner();
        const biz = await makeBusiness(owner.id); // без графика → часы permissive
        const client = await makeClient(biz.id);
        const appt = await makeAppointment(
            biz.id,
            client.id,
            owner.id,
            at(`${MONDAY}T10:00:00Z`),
            60,
        );

        const conflict = await validateSlot({
            businessId: biz.id,
            employeeUserId: owner.id,
            startsAt: at(`${MONDAY}T10:30:00Z`),
            durationMinutes: 30,
        });
        expect(conflict.ok).toBe(false);
        if (!conflict.ok) expect(conflict.code).toBe('SLOT_CONFLICT');

        const excluded = await validateSlot({
            businessId: biz.id,
            employeeUserId: owner.id,
            startsAt: at(`${MONDAY}T10:30:00Z`),
            durationMinutes: 30,
            excludeAppointmentId: appt.id,
        });
        expect(excluded.ok).toBe(true);
    });
});

describe('getAvailability', () => {
    it('закрытый день без графика → out_of_business_hours, нет слотов', async () => {
        const owner = await makeOwner();
        const biz = await makeBusiness(owner.id);
        const [day] = await getAvailability({ businessId: biz.id, from: MONDAY, to: MONDAY });
        expect(day.status).toBe('closed');
        expect(day.closedReason).toBe('out_of_business_hours');
        expect(day.slots).toHaveLength(0);
    });

    it('открытый день нарезается на слоты по шагу', async () => {
        const owner = await makeOwner();
        const biz = await makeBusiness(owner.id);
        await makeSchedule(biz.id, weekdayOf(MONDAY, 'UTC'), 600, 720); // 10:00–12:00
        const [day] = await getAvailability({
            businessId: biz.id,
            from: MONDAY,
            to: MONDAY,
            granularityMinutes: 60,
        });
        expect(day.status).toBe('open');
        expect(day.slots.map((s) => s.startsAt)).toEqual([
            `${MONDAY}T10:00:00+00:00`,
            `${MONDAY}T11:00:00+00:00`,
        ]);
    });

    it('блок и существующая запись убирают соответствующие слоты', async () => {
        const owner = await makeOwner();
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await makeSchedule(biz.id, weekdayOf(MONDAY, 'UTC'), 600, 720); // 10:00–12:00, 2 слота
        await makeTimeOff(biz.id, at(`${MONDAY}T10:00:00Z`), at(`${MONDAY}T11:00:00Z`)); // убирает 10:00
        await makeAppointment(biz.id, client.id, owner.id, at(`${MONDAY}T11:00:00Z`), 60); // убирает 11:00
        const [day] = await getAvailability({
            businessId: biz.id,
            from: MONDAY,
            to: MONDAY,
            granularityMinutes: 60,
        });
        expect(day.status).toBe('open');
        expect(day.slots).toHaveLength(0);
    });

    it('блок на весь день → closed (holiday)', async () => {
        const owner = await makeOwner();
        const biz = await makeBusiness(owner.id);
        await makeSchedule(biz.id, weekdayOf(MONDAY, 'UTC'), 600, 720);
        await makeTimeOff(biz.id, at(`${MONDAY}T00:00:00Z`), at('2026-06-16T00:00:00Z'));
        const [day] = await getAvailability({ businessId: biz.id, from: MONDAY, to: MONDAY });
        expect(day.status).toBe('closed');
        expect(day.closedReason).toBe('holiday');
    });

    it('день без окна при наличии графика → day_off', async () => {
        const owner = await makeOwner();
        const biz = await makeBusiness(owner.id);
        const monday = weekdayOf(MONDAY, 'UTC');
        await makeSchedule(biz.id, monday, 600, 720);
        const tuesday = '2026-06-16';
        const [day] = await getAvailability({ businessId: biz.id, from: tuesday, to: tuesday });
        expect(day.status).toBe('closed');
        expect(day.closedReason).toBe('day_off');
    });

    it('слоты отдаются в зоне бизнеса (offset)', async () => {
        const owner = await makeOwner();
        const biz = await makeBusiness(owner.id, 'Asia/Almaty');
        const wd = weekdayOf(MONDAY, 'Asia/Almaty');
        await makeSchedule(biz.id, wd, 600, 660); // 10:00–11:00 локально
        const [day] = await getAvailability({
            businessId: biz.id,
            from: MONDAY,
            to: MONDAY,
            granularityMinutes: 60,
        });
        expect(day.slots[0].startsAt).toBe(`${MONDAY}T10:00:00+05:00`);
    });
});
