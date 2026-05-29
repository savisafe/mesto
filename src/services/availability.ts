import 'server-only';
import { and, eq, gt, lt, or, isNull, sql } from 'drizzle-orm';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { db } from '@/db';
import {
    appointments,
    businesses,
    businessMembers,
    services,
    users,
    workSchedules,
    timeOff,
} from '@/db/schema';

dayjs.extend(utc);
dayjs.extend(timezone);

export const closedReasons = ['day_off', 'holiday', 'time_off', 'out_of_business_hours'] as const;
export type ClosedReason = (typeof closedReasons)[number];

export interface AvailabilitySlot {
    /** ISO 8601 с offset бизнеса, напр. `2026-06-15T14:00:00+05:00`. */
    startsAt: string;
    endsAt: string;
    masterId: string | null;
    masterName: string | null;
}

export interface DayAvailability {
    /** Локальная дата бизнеса, `YYYY-MM-DD`. */
    date: string;
    status: 'open' | 'closed';
    closedReason: ClosedReason | null;
    slots: AvailabilitySlot[];
}

export interface GetAvailabilityInput {
    businessId: string;
    /** Локальная дата начала окна, `YYYY-MM-DD` (включительно). */
    from: string;
    /** Локальная дата конца окна, `YYYY-MM-DD` (включительно). */
    to: string;
    /** Если задана — длительность слота берётся из услуги. */
    serviceId?: string | null;
    /** Конкретный мастер; иначе слоты по всей команде. */
    employeeUserId?: string | null;
    /** Шаг сетки слотов (мин); дефолт = длительность услуги или 30. */
    granularityMinutes?: number;
}

export type ValidateSlotCode = 'OUT_OF_HOURS' | 'BLOCKED' | 'SLOT_CONFLICT';
export type ValidateSlotResult = { ok: true } | { ok: false; code: ValidateSlotCode };

export interface ValidateSlotInput {
    businessId: string;
    employeeUserId?: string | null;
    startsAt: Date;
    durationMinutes: number;
    /** Игнорировать эту запись при проверке конфликта (для переноса). */
    excludeAppointmentId?: string;
}

interface Interval {
    startsAt: Date;
    endsAt: Date;
}

type ScheduleRow = typeof workSchedules.$inferSelect;

async function getBusinessTimezone(businessId: string): Promise<string> {
    const [b] = await db
        .select({ tz: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
    return b?.tz ?? 'UTC';
}

/** Пересекается ли [s, e) хоть с одним интервалом (полуоткрытые интервалы). */
function overlapsAny(intervals: Interval[], s: Date, e: Date): boolean {
    return intervals.some((iv) => iv.startsAt < e && iv.endsAt > s);
}

/**
 * Рабочие окна (мин от локальной полуночи) для сотрудника на дату.
 * Если у сотрудника есть СВОЙ график — он полностью переопределяет график
 * бизнеса (в т.ч. отсутствие окна в этот день = не работает). Иначе берётся
 * график бизнеса по умолчанию (`employeeUserId = null`).
 */
function windowsFor(
    rows: ScheduleRow[],
    employeeUserId: string | null,
    weekday: number,
    dateStr: string,
): { startMinute: number; endMinute: number }[] {
    const applies = (r: ScheduleRow) =>
        r.weekday === weekday &&
        (r.validFrom == null || r.validFrom <= dateStr) &&
        (r.validUntil == null || r.validUntil >= dateStr);

    const hasOwn = employeeUserId != null && rows.some((r) => r.employeeUserId === employeeUserId);
    const chosen = hasOwn
        ? rows.filter((r) => r.employeeUserId === employeeUserId && applies(r))
        : rows.filter((r) => r.employeeUserId === null && applies(r));
    return chosen.map((r) => ({ startMinute: r.startMinute, endMinute: r.endMinute }));
}

/** Команда бизнеса (владелец + сотрудники) — кандидаты в «мастера». */
export async function getBusinessTeam(
    businessId: string,
): Promise<{ id: string; name: string }[]> {
    const out = new Map<string, { id: string; name: string }>();
    const [biz] = await db
        .select({ ownerId: businesses.ownerId })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
    if (biz) {
        const [owner] = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, biz.ownerId))
            .limit(1);
        if (owner) out.set(owner.id, owner);
    }
    const members = await db
        .select({ id: users.id, name: users.name })
        .from(businessMembers)
        .innerJoin(users, eq(users.id, businessMembers.userId))
        .where(eq(businessMembers.businessId, businessId));
    for (const m of members) out.set(m.id, m);
    return [...out.values()];
}

async function resolveTeam(
    businessId: string,
    employeeUserId: string | null,
): Promise<{ id: string; name: string }[]> {
    if (employeeUserId) {
        const [u] = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, employeeUserId))
            .limit(1);
        return u ? [u] : [];
    }
    // «Любой мастер»: вся команда бизнеса.
    return getBusinessTeam(businessId);
}

/**
 * Свободные слоты на окно дат с учётом рабочего графика, блоков и существующих
 * записей. Дни без рабочего окна возвращаются как `closed`. Если график в
 * бизнесе вообще не настроен — слотов нет (часы неоткуда взять),
 * см. `validateSlot` для записи в этом случае.
 */
export async function getAvailability(input: GetAvailabilityInput): Promise<DayAvailability[]> {
    const { businessId } = input;
    const tz = await getBusinessTimezone(businessId);

    let slotLen = input.granularityMinutes ?? 30;
    if (input.serviceId) {
        const [svc] = await db
            .select({ d: services.durationMinutes })
            .from(services)
            .where(and(eq(services.id, input.serviceId), eq(services.businessId, businessId)))
            .limit(1);
        if (svc) slotLen = svc.d;
    }
    const step = input.granularityMinutes ?? slotLen;
    if (slotLen <= 0 || step <= 0) return [];

    const startDay = dayjs.tz(input.from, tz).startOf('day');
    const endDay = dayjs.tz(input.to, tz).startOf('day');
    if (!startDay.isValid() || !endDay.isValid() || endDay.isBefore(startDay)) return [];

    const rangeStart = startDay.toDate();
    const rangeEnd = endDay.add(1, 'day').toDate();

    const team = await resolveTeam(businessId, input.employeeUserId ?? null);
    const teamIds = new Set(team.map((t) => t.id));
    const scheduleRows = await db
        .select()
        .from(workSchedules)
        .where(eq(workSchedules.businessId, businessId));

    const apptRows = (
        teamIds.size > 0
            ? await db
                  .select({
                      employeeUserId: appointments.employeeUserId,
                      startsAt: appointments.startsAt,
                      endsAt: appointments.endsAt,
                  })
                  .from(appointments)
                  .where(
                      and(
                          eq(appointments.businessId, businessId),
                          or(
                              eq(appointments.status, 'scheduled'),
                              eq(appointments.status, 'completed'),
                          ),
                          lt(appointments.startsAt, rangeEnd),
                          gt(appointments.endsAt, rangeStart),
                      ),
                  )
            : []
    ).filter((a) => a.employeeUserId && teamIds.has(a.employeeUserId));

    const blockRows = await db
        .select({
            employeeUserId: timeOff.employeeUserId,
            startsAt: timeOff.startsAt,
            endsAt: timeOff.endsAt,
        })
        .from(timeOff)
        .where(
            and(
                eq(timeOff.businessId, businessId),
                lt(timeOff.startsAt, rangeEnd),
                gt(timeOff.endsAt, rangeStart),
            ),
        );
    const businessBlocks: Interval[] = blockRows.filter((b) => b.employeeUserId === null);

    const days: DayAvailability[] = [];
    for (let d = startDay; !d.isAfter(endDay); d = d.add(1, 'day')) {
        const dateStr = d.format('YYYY-MM-DD');
        const weekday = d.day();
        const dayStart = d.toDate();
        const dayEnd = d.add(1, 'day').toDate();
        const fullDayClosed = businessBlocks.some(
            (b) => b.startsAt <= dayStart && b.endsAt >= dayEnd,
        );

        let anyWindow = false;
        const slots: AvailabilitySlot[] = [];

        for (const member of team) {
            const windows = windowsFor(scheduleRows, member.id, weekday, dateStr);
            if (windows.length > 0) anyWindow = true;
            const memberBlocks = blockRows.filter(
                (b) => b.employeeUserId === null || b.employeeUserId === member.id,
            );
            const memberAppts = apptRows.filter((a) => a.employeeUserId === member.id);

            for (const w of windows) {
                for (let t = w.startMinute; t + slotLen <= w.endMinute; t += step) {
                    const slotStart = d.add(t, 'minute');
                    const startDate = slotStart.toDate();
                    const endDate = slotStart.add(slotLen, 'minute').toDate();
                    if (overlapsAny(memberBlocks, startDate, endDate)) continue;
                    if (overlapsAny(memberAppts, startDate, endDate)) continue;
                    slots.push({
                        startsAt: slotStart.format('YYYY-MM-DDTHH:mm:ssZ'),
                        endsAt: slotStart.add(slotLen, 'minute').format('YYYY-MM-DDTHH:mm:ssZ'),
                        masterId: member.id,
                        masterName: member.name,
                    });
                }
            }
        }

        slots.sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0));

        let status: 'open' | 'closed' = anyWindow ? 'open' : 'closed';
        let closedReason: ClosedReason | null = null;
        if (fullDayClosed) {
            status = 'closed';
            closedReason = 'holiday';
            slots.length = 0;
        } else if (status === 'closed') {
            closedReason = scheduleRows.length === 0 ? 'out_of_business_hours' : 'day_off';
        }

        days.push({ date: dateStr, status, closedReason, slots });
    }

    return days;
}

async function checkWorkingHours(
    businessId: string,
    employeeUserId: string | null,
    startsAt: Date,
    endsAt: Date,
): Promise<'OK' | 'OUT_OF_HOURS'> {
    const rows = await db
        .select()
        .from(workSchedules)
        .where(eq(workSchedules.businessId, businessId));
    // График не настроен — не ограничиваем (обратная совместимость: до фичи
    // календарь принимал любое время).
    if (rows.length === 0) return 'OK';

    const tz = await getBusinessTimezone(businessId);
    const startLocal = dayjs(startsAt).tz(tz);
    const endLocal = dayjs(endsAt).tz(tz);
    const weekday = startLocal.day();
    const dateStr = startLocal.format('YYYY-MM-DD');
    const startMin = startLocal.hour() * 60 + startLocal.minute();
    // Минуты от локальной полуночи дня НАЧАЛА (если слот ушёл за полночь — > 1440,
    // ни в одно окно не влезет → OUT_OF_HOURS; овернайт не поддерживаем).
    const endMin = endLocal.diff(startLocal.startOf('day'), 'minute');

    const windows = windowsFor(rows, employeeUserId, weekday, dateStr);
    const fits = windows.some((w) => startMin >= w.startMinute && endMin <= w.endMinute);
    return fits ? 'OK' : 'OUT_OF_HOURS';
}

async function overlapsTimeOff(
    businessId: string,
    employeeUserId: string | null,
    startsAt: Date,
    endsAt: Date,
): Promise<boolean> {
    const conds = [
        eq(timeOff.businessId, businessId),
        lt(timeOff.startsAt, endsAt),
        gt(timeOff.endsAt, startsAt),
    ];
    // Бизнес-уровневые блоки (employeeUserId = null) применяются всегда; блоки
    // конкретного сотрудника — только если он указан.
    if (employeeUserId) {
        conds.push(or(isNull(timeOff.employeeUserId), eq(timeOff.employeeUserId, employeeUserId))!);
    } else {
        conds.push(isNull(timeOff.employeeUserId));
    }
    const [hit] = await db
        .select({ id: timeOff.id })
        .from(timeOff)
        .where(and(...conds))
        .limit(1);
    return !!hit;
}

/** Пересечение с активной записью того же сотрудника. Используется и `validateSlot`
 *  (бот), и ручным созданием записи в календаре (там — единственная проверка). */
export async function hasAppointmentConflict(
    businessId: string,
    employeeUserId: string,
    startsAt: Date,
    endsAt: Date,
    excludeAppointmentId?: string,
): Promise<boolean> {
    const conds = [
        eq(appointments.businessId, businessId),
        eq(appointments.employeeUserId, employeeUserId),
        or(eq(appointments.status, 'scheduled'), eq(appointments.status, 'completed')),
        lt(appointments.startsAt, endsAt),
        gt(appointments.endsAt, startsAt),
    ];
    if (excludeAppointmentId) {
        conds.push(sql`${appointments.id} <> ${excludeAppointmentId}`);
    }
    const [hit] = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(and(...conds))
        .limit(1);
    return !!hit;
}

/**
 * Можно ли поставить запись в слот. Источник правды и для ручного создания
 * записи в календаре, и для внешнего API бота. Порядок проверок:
 * рабочие часы → блок → конфликт.
 */
export async function validateSlot(input: ValidateSlotInput): Promise<ValidateSlotResult> {
    const { businessId, startsAt, durationMinutes, excludeAppointmentId } = input;
    const employeeUserId = input.employeeUserId ?? null;
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    if ((await checkWorkingHours(businessId, employeeUserId, startsAt, endsAt)) === 'OUT_OF_HOURS') {
        return { ok: false, code: 'OUT_OF_HOURS' };
    }
    if (await overlapsTimeOff(businessId, employeeUserId, startsAt, endsAt)) {
        return { ok: false, code: 'BLOCKED' };
    }
    if (
        employeeUserId &&
        (await hasAppointmentConflict(businessId, employeeUserId, startsAt, endsAt, excludeAppointmentId))
    ) {
        return { ok: false, code: 'SLOT_CONFLICT' };
    }
    return { ok: true };
}
