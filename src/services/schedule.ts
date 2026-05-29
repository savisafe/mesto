import 'server-only';
import { and, asc, eq, gte, isNull } from 'drizzle-orm';
import { db } from '@/db';
import {
    businesses,
    workSchedules,
    timeOff,
    timeOffReasons,
    type TimeOffReason,
} from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { checkBusinessAccess } from './_access';

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const FORBIDDEN = { ok: false as const, error: 'Нет доступа', code: 'FORBIDDEN' as const };

// 10:00–18:00 — дефолт для дней, по которым график ещё не задан (для UI).
const DEFAULT_START = 600;
const DEFAULT_END = 1080;

export interface WeeklyDay {
    weekday: number; // 0=Вс … 6=Сб
    enabled: boolean;
    startMinute: number;
    endMinute: number;
}

export interface TimeOffItem {
    id: string;
    startsAt: Date;
    endsAt: Date;
    reason: TimeOffReason;
    note: string | null;
}

export interface ScheduleData {
    timezone: string;
    isOwner: boolean;
    days: WeeklyDay[];
    blocks: TimeOffItem[];
}

async function access(businessId: string) {
    const me = await getCurrentUser();
    if (!me) return { kind: 'unauth' as const };
    const role = await checkBusinessAccess(businessId, me.id);
    if (!role) return { kind: 'forbidden' as const };
    return { kind: 'ok' as const, isOwner: role === 'OWNER' };
}

export async function getSchedule(businessId: string): Promise<ServiceResult<ScheduleData>> {
    const a = await access(businessId);
    if (a.kind === 'unauth') return UNAUTHORIZED;
    if (a.kind === 'forbidden') return FORBIDDEN;

    const [biz] = await db
        .select({ timezone: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

    const rows = await db
        .select()
        .from(workSchedules)
        .where(and(eq(workSchedules.businessId, businessId), isNull(workSchedules.employeeUserId)));
    const byWeekday = new Map(rows.map((r) => [r.weekday, r]));

    const days: WeeklyDay[] = Array.from({ length: 7 }, (_, weekday) => {
        const row = byWeekday.get(weekday);
        return row
            ? { weekday, enabled: true, startMinute: row.startMinute, endMinute: row.endMinute }
            : { weekday, enabled: false, startMinute: DEFAULT_START, endMinute: DEFAULT_END };
    });

    const blockRows = await db
        .select()
        .from(timeOff)
        .where(
            and(
                eq(timeOff.businessId, businessId),
                isNull(timeOff.employeeUserId),
                gte(timeOff.endsAt, new Date()),
            ),
        )
        .orderBy(asc(timeOff.startsAt));

    return {
        ok: true,
        data: {
            timezone: biz?.timezone ?? 'UTC',
            isOwner: a.isOwner,
            days,
            blocks: blockRows.map((b) => ({
                id: b.id,
                startsAt: b.startsAt,
                endsAt: b.endsAt,
                reason: b.reason,
                note: b.note,
            })),
        },
    };
}

export async function setWeeklyHours(
    businessId: string,
    days: WeeklyDay[],
): Promise<ServiceResult<{ ok: true }>> {
    const a = await access(businessId);
    if (a.kind === 'unauth') return UNAUTHORIZED;
    if (a.kind === 'forbidden') return FORBIDDEN;

    for (const d of days) {
        if (!d.enabled) continue;
        if (
            !Number.isInteger(d.weekday) ||
            d.weekday < 0 ||
            d.weekday > 6 ||
            !Number.isInteger(d.startMinute) ||
            !Number.isInteger(d.endMinute) ||
            d.startMinute < 0 ||
            d.endMinute > 1440 ||
            d.startMinute >= d.endMinute
        ) {
            return { ok: false, error: 'Некорректные часы работы', code: 'INVALID_HOURS' };
        }
    }

    // Полная замена business-default графика.
    await db
        .delete(workSchedules)
        .where(and(eq(workSchedules.businessId, businessId), isNull(workSchedules.employeeUserId)));

    const toInsert = days
        .filter((d) => d.enabled)
        .map((d) => ({
            businessId,
            employeeUserId: null,
            weekday: d.weekday,
            startMinute: d.startMinute,
            endMinute: d.endMinute,
        }));
    if (toInsert.length > 0) {
        await db.insert(workSchedules).values(toInsert);
    }
    return { ok: true, data: { ok: true } };
}

export interface AddTimeOffInput {
    businessId: string;
    startsAt: Date;
    endsAt: Date;
    reason?: TimeOffReason;
    note?: string | null;
}

export async function addTimeOff(input: AddTimeOffInput): Promise<ServiceResult<TimeOffItem>> {
    const a = await access(input.businessId);
    if (a.kind === 'unauth') return UNAUTHORIZED;
    if (a.kind === 'forbidden') return FORBIDDEN;

    if (
        !(input.startsAt instanceof Date) ||
        !(input.endsAt instanceof Date) ||
        isNaN(input.startsAt.getTime()) ||
        isNaN(input.endsAt.getTime()) ||
        input.startsAt >= input.endsAt
    ) {
        return { ok: false, error: 'Некорректный интервал', code: 'INVALID_INTERVAL' };
    }
    const reason: TimeOffReason =
        input.reason && timeOffReasons.includes(input.reason) ? input.reason : 'other';

    const [row] = await db
        .insert(timeOff)
        .values({
            businessId: input.businessId,
            employeeUserId: null,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            reason,
            note: input.note?.trim() || null,
        })
        .returning();
    return {
        ok: true,
        data: {
            id: row.id,
            startsAt: row.startsAt,
            endsAt: row.endsAt,
            reason: row.reason,
            note: row.note,
        },
    };
}

export async function removeTimeOff(
    businessId: string,
    id: string,
): Promise<ServiceResult<{ id: string }>> {
    const a = await access(businessId);
    if (a.kind === 'unauth') return UNAUTHORIZED;
    if (a.kind === 'forbidden') return FORBIDDEN;

    const [block] = await db
        .select({ id: timeOff.id })
        .from(timeOff)
        .where(and(eq(timeOff.id, id), eq(timeOff.businessId, businessId)))
        .limit(1);
    if (!block) return { ok: false, error: 'Блок не найден', code: 'NOT_FOUND' };

    await db.delete(timeOff).where(eq(timeOff.id, id));
    return { ok: true, data: { id } };
}
