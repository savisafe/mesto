import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

vi.mock('@/lib/auth', () => ({
    getCurrentUser: vi.fn(),
}));

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { toPublicUser, type PublicUser, type UserRole } from '@/db/schema';
import { getCalendarDay } from './calendar';

dayjs.extend(utc);
dayjs.extend(timezone);

const mockGetCurrentUser = vi.mocked(getCurrentUser);

// Понедельник, зона бизнеса UTC → локальное время = UTC.
const MONDAY = '2026-06-15';
const MONDAY_WEEKDAY = dayjs.tz(MONDAY, 'UTC').day();
const at = (iso: string) => new Date(iso);

async function makeUser(name: string, role: UserRole = 'OWNER'): Promise<PublicUser> {
    const [u] = await db
        .insert(schema.users)
        .values({ email: `${name}${Math.random()}@t.local`, passwordHash: 'x', name, role })
        .returning();
    return toPublicUser(u);
}

async function makeBusiness(ownerId: string, tz = 'UTC') {
    const [b] = await db
        .insert(schema.businesses)
        .values({ name: 'Biz', ownerId, timezone: tz })
        .returning();
    return b;
}

async function addMember(businessId: string, userId: string) {
    await db
        .insert(schema.businessMembers)
        .values({ businessId, userId, role: 'EMPLOYEE' });
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
    startMinute: number,
    endMinute: number,
    employeeUserId: string | null = null,
) {
    await db.insert(schema.workSchedules).values({
        businessId,
        employeeUserId,
        weekday: MONDAY_WEEKDAY,
        startMinute,
        endMinute,
    });
}

async function makeTimeOff(
    businessId: string,
    startsAt: Date,
    endsAt: Date,
    employeeUserId: string | null = null,
) {
    await db
        .insert(schema.timeOff)
        .values({ businessId, employeeUserId, startsAt, endsAt, reason: 'lunch' });
}

async function login(user: PublicUser) {
    mockGetCurrentUser.mockResolvedValue(user);
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
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue(null);
});

describe('getCalendarDay', () => {
    it('UNAUTHORIZED без логина', async () => {
        const r = await getCalendarDay('00000000-0000-0000-0000-000000000000', MONDAY);
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('UNAUTHORIZED');
    });

    it('FORBIDDEN без доступа к бизнесу', async () => {
        const owner = await makeUser('Owner');
        const other = await makeUser('Other');
        const biz = await makeBusiness(owner.id);
        await login(other);
        const r = await getCalendarDay(biz.id, MONDAY);
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('FORBIDDEN');
    });

    it('колонки команды с рабочими окнами; персональный график переопределяет', async () => {
        const owner = await makeUser('Owner');
        const member = await makeUser('Member', 'EMPLOYEE');
        const biz = await makeBusiness(owner.id);
        await addMember(biz.id, member.id);
        await makeSchedule(biz.id, 600, 720, null); // бизнес 10:00–12:00
        await makeSchedule(biz.id, 540, 600, member.id); // у member свои 9:00–10:00

        await login(owner);
        const r = await getCalendarDay(biz.id, MONDAY);
        expect(r.ok).toBe(true);
        if (!r.ok) return;

        expect(r.data.date).toBe(MONDAY);
        expect(r.data.timezone).toBe('UTC');
        expect(r.data.dayStart.toISOString()).toBe('2026-06-15T00:00:00.000Z');
        expect(r.data.dayEnd.toISOString()).toBe('2026-06-16T00:00:00.000Z');
        expect(r.data.businessWindows).toEqual([{ startMinute: 600, endMinute: 720 }]);

        const ownerCol = r.data.columns.find((c) => c.employeeId === owner.id);
        const memberCol = r.data.columns.find((c) => c.employeeId === member.id);
        expect(ownerCol?.windows).toEqual([{ startMinute: 600, endMinute: 720 }]); // наследует бизнес
        expect(memberCol?.windows).toEqual([{ startMinute: 540, endMinute: 600 }]); // свой график
    });

    it('возвращает блоки, пересекающие день (бизнес + сотрудник), и не трогает чужие дни', async () => {
        const owner = await makeUser('Owner');
        const biz = await makeBusiness(owner.id);
        await makeTimeOff(biz.id, at(`${MONDAY}T10:00:00Z`), at(`${MONDAY}T11:00:00Z`), null);
        await makeTimeOff(biz.id, at(`${MONDAY}T13:00:00Z`), at(`${MONDAY}T13:30:00Z`), owner.id);
        await makeTimeOff(biz.id, at('2026-06-20T10:00:00Z'), at('2026-06-20T11:00:00Z')); // другой день

        await login(owner);
        const r = await getCalendarDay(biz.id, MONDAY);
        expect(r.ok).toBe(true);
        if (!r.ok) return;

        expect(r.data.blocks).toHaveLength(2);
        const owners = r.data.blocks.map((b) => b.employeeUserId).sort();
        expect(owners).toEqual([null, owner.id].sort());
    });

    it('включает записи дня с деталями', async () => {
        const owner = await makeUser('Owner');
        const biz = await makeBusiness(owner.id);
        const client = await makeClient(biz.id);
        await db.insert(schema.appointments).values({
            businessId: biz.id,
            clientId: client.id,
            employeeUserId: owner.id,
            startsAt: at(`${MONDAY}T10:00:00Z`),
            endsAt: at(`${MONDAY}T11:00:00Z`),
        });

        await login(owner);
        const r = await getCalendarDay(biz.id, MONDAY);
        expect(r.ok).toBe(true);
        if (!r.ok) return;

        expect(r.data.appointments).toHaveLength(1);
        expect(r.data.appointments[0].employee?.id).toBe(owner.id);
        expect(r.data.appointments[0].client.name).toBe('Client');
    });
});
