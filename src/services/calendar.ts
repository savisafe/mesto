import 'server-only';
import { and, eq, gt, lt } from 'drizzle-orm';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { db } from '@/db';
import { businesses, workSchedules, timeOff, type TimeOffReason } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { checkBusinessAccess } from './_access';
import { getBusinessTeam, windowsFor } from './availability';
import { listAppointments, type AppointmentDetail } from './appointments';

dayjs.extend(utc);
dayjs.extend(timezone);

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const FORBIDDEN = { ok: false as const, error: 'Нет доступа', code: 'FORBIDDEN' as const };

export interface CalendarWindow {
    startMinute: number;
    endMinute: number;
}

export interface CalendarBlock {
    id: string;
    /** null = блок всего бизнеса (на все колонки), иначе — конкретного сотрудника. */
    employeeUserId: string | null;
    startsAt: Date;
    endsAt: Date;
    reason: TimeOffReason;
    note: string | null;
}

export interface CalendarColumn {
    employeeId: string;
    employeeName: string;
    /** Рабочие окна сотрудника на этот день недели (мин от локальной полуночи). */
    windows: CalendarWindow[];
}

export interface CalendarDayData {
    /** Локальная дата бизнеса, `YYYY-MM-DD`. */
    date: string;
    timezone: string;
    /** UTC-момент локальной полуночи дня (точка отсчёта позиционирования). */
    dayStart: Date;
    /** UTC-момент следующей локальной полуночи. */
    dayEnd: Date;
    columns: CalendarColumn[];
    /** Рабочие окна бизнеса по умолчанию — для колонки «Без сотрудника». */
    businessWindows: CalendarWindow[];
    /** Все блоки `time_off`, пересекающие день (бизнес-уровня и по сотруднику). */
    blocks: CalendarBlock[];
    appointments: AppointmentDetail[];
}

/**
 * Агрегат для дневной сетки календаря: команда + рабочие окна на дату, блоки и
 * записи дня. Источник истины по часам — `windowsFor` (та же логика, что у
 * доступности). Часы/блоки здесь — для отображения, не для enforce'а.
 */
export async function getCalendarDay(
    businessId: string,
    date: string,
): Promise<ServiceResult<CalendarDayData>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;
    const access = await checkBusinessAccess(businessId, user.id);
    if (!access) return FORBIDDEN;

    const [biz] = await db
        .select({ tz: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
    const tz = biz?.tz ?? 'UTC';

    const day = dayjs.tz(date, tz).startOf('day');
    if (!day.isValid()) return { ok: false, error: 'Некорректная дата', code: 'INVALID_DATE' };
    const dayStart = day.toDate();
    const dayEnd = day.add(1, 'day').toDate();
    const weekday = day.day();
    const dateStr = day.format('YYYY-MM-DD');

    const [team, scheduleRows] = await Promise.all([
        getBusinessTeam(businessId),
        db.select().from(workSchedules).where(eq(workSchedules.businessId, businessId)),
    ]);

    const columns: CalendarColumn[] = team.map((m) => ({
        employeeId: m.id,
        employeeName: m.name,
        windows: windowsFor(scheduleRows, m.id, weekday, dateStr),
    }));
    const businessWindows = windowsFor(scheduleRows, null, weekday, dateStr);

    const blockRows = await db
        .select()
        .from(timeOff)
        .where(
            and(
                eq(timeOff.businessId, businessId),
                lt(timeOff.startsAt, dayEnd),
                gt(timeOff.endsAt, dayStart),
            ),
        );
    const blocks: CalendarBlock[] = blockRows.map((b) => ({
        id: b.id,
        employeeUserId: b.employeeUserId,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        reason: b.reason,
        note: b.note,
    }));

    const appts = await listAppointments({ businessId, from: dayStart, to: dayEnd });
    if (!appts.ok) return appts;

    return {
        ok: true,
        data: {
            date: dateStr,
            timezone: tz,
            dayStart,
            dayEnd,
            columns,
            businessWindows,
            blocks,
            appointments: appts.data,
        },
    };
}
