import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));

import { db } from '@/db';
import * as schema from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { toPublicUser, type PublicUser } from '@/db/schema';
import {
    getSchedule,
    setWeeklyHours,
    addTimeOff,
    removeTimeOff,
    type WeeklyDay,
} from './schedule';

const mockGetCurrentUser = vi.mocked(getCurrentUser);

async function makeUser(email: string): Promise<PublicUser> {
    const [u] = await db
        .insert(schema.users)
        .values({ email, passwordHash: 'x', name: email, phone: '+70000000000' })
        .returning();
    return toPublicUser(u);
}
async function makeBusiness(ownerId: string) {
    const [b] = await db.insert(schema.businesses).values({ name: 'Biz', ownerId }).returning();
    return b;
}

function weekTemplate(): WeeklyDay[] {
    return Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        enabled: false,
        startMinute: 600,
        endMinute: 1080,
    }));
}

beforeEach(async () => {
    await db.delete(schema.timeOff);
    await db.delete(schema.workSchedules);
    await db.delete(schema.businessMembers);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue(null);
});

describe('getSchedule', () => {
    it('UNAUTHORIZED без сессии', async () => {
        const r = await getSchedule('x');
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('UNAUTHORIZED');
    });

    it('FORBIDDEN если не в бизнесе', async () => {
        const owner = await makeUser('o@t.local');
        const stranger = await makeUser('s@t.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(stranger);
        const r = await getSchedule(biz.id);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('FORBIDDEN');
    });

    it('возвращает 7 дней (по умолчанию выключены)', async () => {
        const owner = await makeUser('o@t.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(owner);
        const r = await getSchedule(biz.id);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.days).toHaveLength(7);
        expect(r.data.days.every((d) => !d.enabled)).toBe(true);
        expect(r.data.isOwner).toBe(true);
    });
});

describe('setWeeklyHours', () => {
    it('сохраняет включённые дни и отражается в getSchedule', async () => {
        const owner = await makeUser('o@t.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(owner);

        const days = weekTemplate();
        days[1] = { weekday: 1, enabled: true, startMinute: 600, endMinute: 720 };
        const set = await setWeeklyHours(biz.id, days);
        expect(set.ok).toBe(true);

        const r = await getSchedule(biz.id);
        if (!r.ok) throw new Error('fail');
        const monday = r.data.days.find((d) => d.weekday === 1)!;
        expect(monday.enabled).toBe(true);
        expect(monday.startMinute).toBe(600);
        expect(monday.endMinute).toBe(720);
        expect(r.data.days.filter((d) => d.enabled)).toHaveLength(1);
    });

    it('полная замена: повторный set с другими днями вытесняет старые', async () => {
        const owner = await makeUser('o@t.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(owner);

        const d1 = weekTemplate();
        d1[1].enabled = true;
        await setWeeklyHours(biz.id, d1);
        const d2 = weekTemplate();
        d2[2].enabled = true;
        await setWeeklyHours(biz.id, d2);

        const r = await getSchedule(biz.id);
        if (!r.ok) throw new Error('fail');
        expect(r.data.days.find((d) => d.weekday === 1)!.enabled).toBe(false);
        expect(r.data.days.find((d) => d.weekday === 2)!.enabled).toBe(true);
    });

    it('INVALID_HOURS если start >= end', async () => {
        const owner = await makeUser('o@t.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(owner);
        const days = weekTemplate();
        days[1] = { weekday: 1, enabled: true, startMinute: 720, endMinute: 600 };
        const r = await setWeeklyHours(biz.id, days);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('INVALID_HOURS');
    });
});

describe('addTimeOff / removeTimeOff', () => {
    it('добавляет и удаляет блок', async () => {
        const owner = await makeUser('o@t.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(owner);

        const add = await addTimeOff({
            businessId: biz.id,
            startsAt: new Date('2026-06-15T10:00:00Z'),
            endsAt: new Date('2026-06-15T11:00:00Z'),
            reason: 'lunch',
        });
        expect(add.ok).toBe(true);
        if (!add.ok) return;

        const r1 = await getSchedule(biz.id);
        expect(r1.ok && r1.data.blocks).toHaveLength(1);

        const rem = await removeTimeOff(biz.id, add.data.id);
        expect(rem.ok).toBe(true);

        const r2 = await getSchedule(biz.id);
        expect(r2.ok && r2.data.blocks).toHaveLength(0);
    });

    it('INVALID_INTERVAL если конец не позже начала', async () => {
        const owner = await makeUser('o@t.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(owner);
        const r = await addTimeOff({
            businessId: biz.id,
            startsAt: new Date('2026-06-15T11:00:00Z'),
            endsAt: new Date('2026-06-15T10:00:00Z'),
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('INVALID_INTERVAL');
    });

    it('NOT_FOUND при удалении блока чужого бизнеса', async () => {
        const owner = await makeUser('o@t.local');
        const biz = await makeBusiness(owner.id);
        const other = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(owner);
        const add = await addTimeOff({
            businessId: biz.id,
            startsAt: new Date('2026-06-15T10:00:00Z'),
            endsAt: new Date('2026-06-15T11:00:00Z'),
        });
        if (!add.ok) throw new Error('setup');
        const r = await removeTimeOff(other.id, add.data.id);
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('NOT_FOUND');
    });
});
