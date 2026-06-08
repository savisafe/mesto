import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

import { db } from '@/db';
import * as schema from '@/db/schema';
import { createPublicReview, getBusinessReviews } from './reviews';

async function makeUser(email: string) {
    const [u] = await db
        .insert(schema.users)
        .values({ email, passwordHash: 'argon2$test', name: email, phone: '+70000000000' })
        .returning();
    return u;
}

async function makeBusiness(ownerId: string, slug = 'studio') {
    const [b] = await db
        .insert(schema.businesses)
        .values({ name: 'Studio', ownerId, slug, publicBookingEnabled: true, isActive: true })
        .returning();
    return b;
}

async function makeClient(businessId: string, name = 'Анна', phone = '+77001112233') {
    const [c] = await db.insert(schema.clients).values({ businessId, name, phone }).returning();
    return c;
}

async function makeCompletedAppointment(
    businessId: string,
    clientId: string,
    employeeUserId: string | null = null,
    startsAt = new Date('2026-06-01T10:00:00Z'),
) {
    const [a] = await db
        .insert(schema.appointments)
        .values({
            businessId,
            clientId,
            employeeUserId,
            startsAt,
            endsAt: new Date(startsAt.getTime() + 60 * 60_000),
            status: 'completed',
        })
        .returning();
    return a;
}

beforeEach(async () => {
    await db.delete(schema.reviews);
    await db.delete(schema.appointments);
    await db.delete(schema.clients);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
});

describe('createPublicReview', () => {
    it('успех после завершённого визита', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await makeCompletedAppointment(biz.id, client.id, owner.id);

        const r = await createPublicReview({
            slug: 'studio',
            phone: client.phone,
            rating: 5,
            comment: 'Отлично',
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.rating).toBe(5);
    });

    it('REVIEW_NOT_ALLOWED если нет клиента с таким телефоном', async () => {
        const owner = await makeUser('o@test.local');
        await makeBusiness(owner.id);

        const r = await createPublicReview({ slug: 'studio', phone: '+79990000000', rating: 5 });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('REVIEW_NOT_ALLOWED');
    });

    it('REVIEW_NOT_ALLOWED если визит не завершён', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        // scheduled, не completed
        await db.insert(schema.appointments).values({
            businessId: biz.id,
            clientId: client.id,
            startsAt: new Date('2026-06-01T10:00:00Z'),
            endsAt: new Date('2026-06-01T11:00:00Z'),
            status: 'scheduled',
        });

        const r = await createPublicReview({ slug: 'studio', phone: client.phone, rating: 4 });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('REVIEW_NOT_ALLOWED');
    });

    it('один отзыв на запись — повторный не проходит', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await makeCompletedAppointment(biz.id, client.id);

        const first = await createPublicReview({ slug: 'studio', phone: client.phone, rating: 5 });
        expect(first.ok).toBe(true);

        const second = await createPublicReview({ slug: 'studio', phone: client.phone, rating: 1 });
        expect(second.ok).toBe(false);
    });

    it('INVALID_RATING вне диапазона 1..5', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await makeCompletedAppointment(biz.id, client.id);

        const r = await createPublicReview({ slug: 'studio', phone: client.phone, rating: 6 });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('INVALID_RATING');
    });
});

describe('getBusinessReviews', () => {
    it('считает средний, количество, распределение и рейтинг по специалистам', async () => {
        const owner = await makeUser('o@test.local');
        const master = await makeUser('m@test.local');
        const biz = await makeBusiness(owner.id);
        const c1 = await makeClient(biz.id, 'Анна', '+70000000001');
        const c2 = await makeClient(biz.id, 'Борис', '+70000000002');
        await makeCompletedAppointment(biz.id, c1.id, master.id, new Date('2026-06-01T10:00:00Z'));
        await makeCompletedAppointment(biz.id, c2.id, master.id, new Date('2026-06-02T10:00:00Z'));

        await createPublicReview({ slug: 'studio', phone: c1.phone, rating: 5 });
        await createPublicReview({ slug: 'studio', phone: c2.phone, rating: 3 });

        const data = await getBusinessReviews(biz.id);
        expect(data.summary.count).toBe(2);
        expect(data.summary.average).toBe(4);
        expect(data.summary.distribution[5]).toBe(1);
        expect(data.summary.distribution[3]).toBe(1);
        expect(data.employeeRatings[master.id]).toEqual({ average: 4, count: 2 });
        expect(data.recent).toHaveLength(2);
    });

    it('скрытые отзывы исключаются из агрегатов', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await makeCompletedAppointment(biz.id, client.id);
        const created = await createPublicReview({ slug: 'studio', phone: client.phone, rating: 5 });
        if (!created.ok) throw new Error('setup failed');

        // скрываем все отзывы бизнеса
        await db.update(schema.reviews).set({ isHidden: true });

        const data = await getBusinessReviews(biz.id);
        expect(data.summary.count).toBe(0);
        expect(data.recent).toHaveLength(0);
    });
});
