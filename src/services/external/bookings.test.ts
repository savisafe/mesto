import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../../tests/db');
    const db = await createTestDb();
    return { db };
});

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
    createExternalBooking,
    getExternalBooking,
    cancelExternalBooking,
    updateExternalBooking,
    listExternalBookings,
} from './bookings';

dayjs.extend(utc);
dayjs.extend(timezone);

const MONDAY = '2026-06-15';
const at = (iso: string) => new Date(iso);
const weekdayOf = (d: string, tz: string) => dayjs.tz(d, tz).day();

async function makeBusiness(isActive = true) {
    const [owner] = await db
        .insert(schema.users)
        .values({ email: `o${Math.random()}@t.local`, passwordHash: 'x', name: 'Owner' })
        .returning();
    const [biz] = await db
        .insert(schema.businesses)
        .values({ name: 'Biz', ownerId: owner.id, isActive })
        .returning();
    return { biz, owner };
}

async function makeMember(businessId: string, name: string) {
    const [u] = await db
        .insert(schema.users)
        .values({ email: `e${Math.random()}@t.local`, passwordHash: 'x', name })
        .returning();
    await db.insert(schema.businessMembers).values({ businessId, userId: u.id, role: 'EMPLOYEE' });
    return u;
}

async function makeService(
    businessId: string,
    opts: { externalId?: string; name?: string; amount?: number; duration?: number } = {},
) {
    const [s] = await db
        .insert(schema.services)
        .values({
            businessId,
            externalId: opts.externalId ?? null,
            name: opts.name ?? 'Коррекция',
            amount: opts.amount ?? 4000,
            currency: 'KZT',
            durationMinutes: opts.duration ?? 30,
        })
        .returning();
    return s;
}

async function makeClient(businessId: string, phone: string, telegramId: string | null = null) {
    const [c] = await db
        .insert(schema.clients)
        .values({ businessId, name: 'Existing', phone, telegramId })
        .returning();
    return c;
}

const baseInput = (businessId: string, key: string) => ({
    businessId,
    idempotencyKey: key,
    serviceName: 'Коррекция',
    startsAt: at(`${MONDAY}T10:00:00Z`),
    durationMinutes: 30,
    client: { name: 'Анна', phone: '+77001234567', telegramId: '123' },
});

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

describe('createExternalBooking', () => {
    it('happy path: создаёт запись source=external, клиента, матчит услугу', async () => {
        const { biz } = await makeBusiness();
        await makeService(biz.id, { externalId: 'correction', amount: 4000 });
        const r = await createExternalBooking({
            ...baseInput(biz.id, 'k1'),
            serviceExternalId: 'correction',
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.clientCreated).toBe(true);
        expect(r.serviceMatched).toBe(true);
        const [row] = await db
            .select()
            .from(schema.appointments)
            .where(eq(schema.appointments.id, r.appointmentId));
        expect(row.source).toBe('external');
        expect(row.externalIdempotencyKey).toBe('k1');
        expect(row.amount).toBe(4000);
    });

    it('идемпотентный повтор → тот же appointment_id, без дубля', async () => {
        const { biz } = await makeBusiness();
        await makeService(biz.id, { externalId: 'correction' });
        const first = await createExternalBooking({
            ...baseInput(biz.id, 'dup'),
            serviceExternalId: 'correction',
        });
        const second = await createExternalBooking({
            ...baseInput(biz.id, 'dup'),
            serviceExternalId: 'correction',
        });
        expect(first.ok && second.ok).toBe(true);
        if (!first.ok || !second.ok) return;
        expect(second.idempotentReplay).toBe(true);
        expect(second.appointmentId).toBe(first.appointmentId);
        const rows = await db
            .select()
            .from(schema.appointments)
            .where(eq(schema.appointments.businessId, biz.id));
        expect(rows).toHaveLength(1);
    });

    it('ad-hoc услуга (нет матча) → serviceMatched=false, amount из payload', async () => {
        const { biz } = await makeBusiness();
        const r = await createExternalBooking({ ...baseInput(biz.id, 'k2'), amount: 7777 });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.serviceMatched).toBe(false);
        const [row] = await db
            .select()
            .from(schema.appointments)
            .where(eq(schema.appointments.id, r.appointmentId));
        expect(row.serviceId).toBeNull();
        expect(row.amount).toBe(7777);
    });

    it('amount берётся из услуги, если в payload null', async () => {
        const { biz } = await makeBusiness();
        await makeService(biz.id, { externalId: 'correction', amount: 5500 });
        const r = await createExternalBooking({
            ...baseInput(biz.id, 'k3'),
            serviceExternalId: 'correction',
            amount: null,
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const [row] = await db
            .select()
            .from(schema.appointments)
            .where(eq(schema.appointments.id, r.appointmentId));
        expect(row.amount).toBe(5500);
    });

    it('матч мастера по имени; неизвестный → masterMatched=false', async () => {
        const { biz } = await makeBusiness();
        await makeMember(biz.id, 'Дарья');
        const matched = await createExternalBooking({ ...baseInput(biz.id, 'm1'), masterName: 'дарья' });
        expect(matched.ok).toBe(true);
        if (matched.ok) expect(matched.masterMatched).toBe(true);

        const unknown = await createExternalBooking({ ...baseInput(biz.id, 'm2'), masterName: 'Кто-то' });
        expect(unknown.ok).toBe(true);
        if (unknown.ok) expect(unknown.masterMatched).toBe(false);
    });

    it('OUT_OF_HOURS вне графика', async () => {
        const { biz } = await makeBusiness();
        await db
            .insert(schema.workSchedules)
            .values({ businessId: biz.id, weekday: weekdayOf(MONDAY, 'UTC'), startMinute: 600, endMinute: 720 });
        const r = await createExternalBooking({
            ...baseInput(biz.id, 'oh'),
            startsAt: at(`${MONDAY}T09:00:00Z`),
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('OUT_OF_HOURS');
    });

    it('BLOCKED при бизнес-блоке', async () => {
        const { biz } = await makeBusiness();
        await db
            .insert(schema.timeOff)
            .values({
                businessId: biz.id,
                startsAt: at(`${MONDAY}T10:00:00Z`),
                endsAt: at(`${MONDAY}T11:00:00Z`),
                reason: 'lunch',
            });
        const r = await createExternalBooking(baseInput(biz.id, 'bl'));
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('BLOCKED');
    });

    it('SLOT_CONFLICT при занятом мастере', async () => {
        const { biz } = await makeBusiness();
        const daria = await makeMember(biz.id, 'Дарья');
        const client = await makeClient(biz.id, '+70000000000');
        await db.insert(schema.appointments).values({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: daria.id,
            startsAt: at(`${MONDAY}T10:00:00Z`),
            endsAt: at(`${MONDAY}T11:00:00Z`),
        });
        const r = await createExternalBooking({
            ...baseInput(biz.id, 'cf'),
            masterName: 'Дарья',
            startsAt: at(`${MONDAY}T10:30:00Z`),
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('SLOT_CONFLICT');
    });

    it('BUSINESS_INACTIVE', async () => {
        const { biz } = await makeBusiness(false);
        const r = await createExternalBooking(baseInput(biz.id, 'ia'));
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('BUSINESS_INACTIVE');
    });

    it('INVALID_PAYLOAD при некорректной длительности', async () => {
        const { biz } = await makeBusiness();
        const r = await createExternalBooking({ ...baseInput(biz.id, 'inv'), durationMinutes: 0 });
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(r.code).toBe('INVALID_PAYLOAD');
            expect(r.field).toBe('duration_minutes');
        }
    });

    it('clientCreated=false если клиент уже есть по телефону', async () => {
        const { biz } = await makeBusiness();
        await makeClient(biz.id, '+77001234567');
        const r = await createExternalBooking(baseInput(biz.id, 'ex'));
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.clientCreated).toBe(false);
    });
});

describe('getExternalBooking', () => {
    it('возвращает деталь; чужой бизнес → null', async () => {
        const { biz } = await makeBusiness();
        const other = await makeBusiness();
        const created = await createExternalBooking(baseInput(biz.id, 'g1'));
        if (!created.ok) throw new Error('setup');

        const detail = await getExternalBooking(biz.id, created.appointmentId);
        expect(detail?.appointmentId).toBe(created.appointmentId);
        expect(detail?.client.phone).toBe('+77001234567');

        const cross = await getExternalBooking(other.biz.id, created.appointmentId);
        expect(cross).toBeNull();
    });
});

describe('cancelExternalBooking', () => {
    it('отменяет, идемпотентна, NOT_FOUND для чужой', async () => {
        const { biz } = await makeBusiness();
        const created = await createExternalBooking(baseInput(biz.id, 'c1'));
        if (!created.ok) throw new Error('setup');

        const r1 = await cancelExternalBooking(biz.id, created.appointmentId);
        expect(r1.ok).toBe(true);
        const [row] = await db
            .select()
            .from(schema.appointments)
            .where(eq(schema.appointments.id, created.appointmentId));
        expect(row.status).toBe('cancelled');

        const r2 = await cancelExternalBooking(biz.id, created.appointmentId);
        expect(r2.ok).toBe(true);

        const r3 = await cancelExternalBooking(biz.id, '00000000-0000-0000-0000-000000000000');
        expect(r3.ok).toBe(false);
        if (!r3.ok) expect(r3.code).toBe('NOT_FOUND');
    });
});

describe('updateExternalBooking', () => {
    it('перенос на свободное время — ok', async () => {
        const { biz } = await makeBusiness();
        const created = await createExternalBooking(baseInput(biz.id, 'u1'));
        if (!created.ok) throw new Error('setup');
        const r = await updateExternalBooking(biz.id, created.appointmentId, {
            startsAt: at(`${MONDAY}T14:00:00Z`),
        });
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.detail.startsAt.toISOString()).toBe(at(`${MONDAY}T14:00:00Z`).toISOString());
        }
    });

    it('перенос на занятый слот того же мастера → SLOT_CONFLICT', async () => {
        const { biz } = await makeBusiness();
        await makeMember(biz.id, 'Дарья');
        const b1 = await createExternalBooking({ ...baseInput(biz.id, 'u2a'), masterName: 'Дарья' });
        const b2 = await createExternalBooking({
            ...baseInput(biz.id, 'u2b'),
            masterName: 'Дарья',
            startsAt: at(`${MONDAY}T12:00:00Z`),
        });
        if (!b1.ok || !b2.ok) throw new Error('setup');
        const r = await updateExternalBooking(biz.id, b2.appointmentId, {
            startsAt: at(`${MONDAY}T10:00:00Z`),
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('SLOT_CONFLICT');
    });

    it('NOT_FOUND для чужого id', async () => {
        const { biz } = await makeBusiness();
        const r = await updateExternalBooking(biz.id, '00000000-0000-0000-0000-000000000000', {
            notes: 'x',
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('NOT_FOUND');
    });
});

describe('listExternalBookings', () => {
    it('фильтр по telegram_id', async () => {
        const { biz } = await makeBusiness();
        await createExternalBooking(baseInput(biz.id, 'l1'));
        await createExternalBooking({
            ...baseInput(biz.id, 'l2'),
            client: { name: 'Б', phone: '+79990000000', telegramId: '999' },
        });
        const list = await listExternalBookings(biz.id, { telegramId: '123' });
        expect(list).toHaveLength(1);
        expect(list[0].client.phone).toBe('+77001234567');
    });

    it('фильтр по статусу', async () => {
        const { biz } = await makeBusiness();
        const a = await createExternalBooking(baseInput(biz.id, 'l3'));
        const b = await createExternalBooking({
            ...baseInput(biz.id, 'l4'),
            client: { name: 'Б', phone: '+79990000000', telegramId: '999' },
        });
        if (!a.ok || !b.ok) throw new Error('setup');
        await cancelExternalBooking(biz.id, b.appointmentId);
        const scheduled = await listExternalBookings(biz.id, { status: 'scheduled' });
        expect(scheduled).toHaveLength(1);
    });
});
