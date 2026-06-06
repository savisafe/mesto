import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getPublicBusiness, createPublicBooking } from './public-booking';

// Будущая дата (среда) — для слотов в рабочих часах.
const FUTURE = new Date('2030-06-19T10:00:00Z');

async function reset() {
    await db.delete(schema.appointments);
    await db.delete(schema.workSchedules);
    await db.delete(schema.services);
    await db.delete(schema.clients);
    await db.delete(schema.businessMembers);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
}

async function seed({ enabled = true, slug = 'salon' } = {}) {
    const [owner] = await db
        .insert(schema.users)
        .values({ email: `o${Math.random()}@t.local`, passwordHash: 'x', name: 'Owner', phone: '+70000000000' })
        .returning();
    const [biz] = await db
        .insert(schema.businesses)
        .values({
            name: 'Salon',
            ownerId: owner.id,
            slug,
            publicBookingEnabled: enabled,
            timezone: 'UTC',
        })
        .returning();
    const [svc] = await db
        .insert(schema.services)
        .values({ businessId: biz.id, name: 'Стрижка', amount: 5000, currency: 'KZT', durationMinutes: 60, isActive: true })
        .returning();
    return { owner, biz, svc };
}

async function addSchedule(businessId: string) {
    // Рабочий график бизнеса (employeeUserId=null) на день FUTURE, 09:00–18:00.
    await db.insert(schema.workSchedules).values({
        businessId,
        employeeUserId: null,
        weekday: FUTURE.getUTCDay(),
        startMinute: 540,
        endMinute: 1080,
    });
}

beforeEach(reset);

describe('getPublicBusiness', () => {
    it('возвращает данные для включённой страницы', async () => {
        const { svc } = await seed();
        const pub = await getPublicBusiness('salon');
        expect(pub).not.toBeNull();
        expect(pub!.services.map((s) => s.id)).toContain(svc.id);
    });

    it('null если публичная запись выключена', async () => {
        await seed({ enabled: false });
        expect(await getPublicBusiness('salon')).toBeNull();
    });

    it('null для неизвестного slug', async () => {
        await seed();
        expect(await getPublicBusiness('nope')).toBeNull();
    });
});

describe('createPublicBooking', () => {
    const client = { name: 'Иван', phone: '+77011112233' };

    it('создаёт запись с source=public и заводит клиента', async () => {
        const { biz, svc } = await seed();
        await addSchedule(biz.id);

        const res = await createPublicBooking({ slug: 'salon', serviceId: svc.id, startsAt: FUTURE, client });
        expect(res.ok).toBe(true);
        if (!res.ok) return;

        const [appt] = await db
            .select()
            .from(schema.appointments)
            .where(eq(schema.appointments.id, res.data.appointmentId));
        expect(appt.source).toBe('public');
        expect(appt.amount).toBe(5000);

        const clients = await db
            .select()
            .from(schema.clients)
            .where(eq(schema.clients.businessId, biz.id));
        expect(clients).toHaveLength(1);
        expect(clients[0].phone).toBe('+77011112233');
    });

    it('NOT_FOUND для выключенной страницы', async () => {
        const { svc } = await seed({ enabled: false });
        const res = await createPublicBooking({ slug: 'salon', serviceId: svc.id, startsAt: FUTURE, client });
        expect(res.ok).toBe(false);
        if (res.ok) return;
        expect(res.code).toBe('NOT_FOUND');
    });

    it('SERVICE_NOT_FOUND для несуществующей услуги', async () => {
        const { biz } = await seed();
        await addSchedule(biz.id);
        const res = await createPublicBooking({
            slug: 'salon',
            serviceId: '00000000-0000-0000-0000-000000000000',
            startsAt: FUTURE,
            client,
        });
        expect(res.ok).toBe(false);
        if (res.ok) return;
        expect(res.code).toBe('SERVICE_NOT_FOUND');
    });

    it('INVALID_PAYLOAD для прошедшего времени', async () => {
        const { biz, svc } = await seed();
        await addSchedule(biz.id);
        const res = await createPublicBooking({
            slug: 'salon',
            serviceId: svc.id,
            startsAt: new Date('2000-01-01T10:00:00Z'),
            client,
        });
        expect(res.ok).toBe(false);
        if (res.ok) return;
        expect(res.code).toBe('INVALID_PAYLOAD');
    });

    it('OUT_OF_HOURS вне рабочего графика', async () => {
        const { biz, svc } = await seed();
        await addSchedule(biz.id);
        const res = await createPublicBooking({
            slug: 'salon',
            serviceId: svc.id,
            startsAt: new Date('2030-06-19T05:00:00Z'), // 05:00 — до открытия
            client,
        });
        expect(res.ok).toBe(false);
        if (res.ok) return;
        expect(res.code).toBe('OUT_OF_HOURS');
    });

    it('SLOT_CONFLICT при повторной записи на то же время и мастера', async () => {
        const { biz, svc, owner } = await seed();
        await addSchedule(biz.id);
        const first = await createPublicBooking({
            slug: 'salon',
            serviceId: svc.id,
            employeeUserId: owner.id,
            startsAt: FUTURE,
            client,
        });
        expect(first.ok).toBe(true);
        const second = await createPublicBooking({
            slug: 'salon',
            serviceId: svc.id,
            employeeUserId: owner.id,
            startsAt: FUTURE,
            client: { name: 'Пётр', phone: '+77019998877' },
        });
        expect(second.ok).toBe(false);
        if (second.ok) return;
        expect(second.code).toBe('SLOT_CONFLICT');
    });
});
