import 'server-only';
import { and, asc, eq, gte, isNull, lt } from 'drizzle-orm';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { db } from '@/db';
import { appointments, businesses, type Appointment } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { checkBusinessAccess } from './_access';
import { getBusinessTeam } from './availability';

dayjs.extend(utc);
dayjs.extend(timezone);

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const FORBIDDEN = { ok: false as const, error: 'Нет доступа', code: 'FORBIDDEN' as const };

// Гранулярность периода. От неё зависит размер бакета временного ряда:
// day → по часам, week/month → по дням, year → по месяцам, custom → по размаху.
export const financeGranularities = ['day', 'week', 'month', 'year', 'custom'] as const;
export type FinanceGranularity = (typeof financeGranularities)[number];

type BucketUnit = 'hour' | 'day' | 'month';

export interface FinanceAnalyticsInput {
    businessId: string;
    /** Локальная дата бизнеса, `YYYY-MM-DD`, включительно. */
    fromDate: string;
    /** Локальная дата бизнеса, `YYYY-MM-DD`, включительно (берётся весь день). */
    toDate: string;
    granularity: FinanceGranularity;
    /** undefined = все сотрудники, null = только без сотрудника, иначе конкретный. */
    employeeUserId?: string | null;
}

export interface FinancePoint {
    /** Подпись бакета для оси графика (в зоне бизнеса). */
    label: string;
    revenue: number;
    pending: number;
    count: number;
}

export interface FinanceEmployeeStat {
    employeeId: string | null;
    name: string;
    revenue: number;
    completed: number;
    scheduled: number;
}

export interface FinanceSummary {
    /** Сумма завершённых записей. */
    revenue: number;
    /** Сумма запланированных (ещё не подтверждённых) записей. */
    pending: number;
    /** Сумма отменённых и неявок. */
    lost: number;
    completedCount: number;
    scheduledCount: number;
    cancelledCount: number;
    noShowCount: number;
    /** Уникальных клиентов с завершёнными записями. */
    clients: number;
    /** Средний чек по завершённым записям. */
    avgCheck: number;
    /** Прошедшие записи в статусе scheduled — ждут подтверждения статуса. */
    unconfirmed: number;
}

export interface FinanceAnalytics {
    currency: string;
    summary: FinanceSummary;
    series: FinancePoint[];
    byEmployee: FinanceEmployeeStat[];
    byStatus: { completed: number; scheduled: number; cancelled: number; no_show: number };
}

function bucketUnitFor(g: FinanceGranularity, fromDate: string, toDate: string): BucketUnit {
    if (g === 'day') return 'hour';
    if (g === 'week' || g === 'month') return 'day';
    if (g === 'year') return 'month';
    // custom: выбираем по размаху диапазона
    const spanDays = dayjs(toDate).diff(dayjs(fromDate), 'day');
    if (spanDays <= 2) return 'hour';
    if (spanDays <= 92) return 'day';
    return 'month';
}

function labelFor(d: dayjs.Dayjs, unit: BucketUnit, tz: string): string {
    const date = d.toDate();
    if (unit === 'hour') {
        return new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: tz,
        }).format(date);
    }
    if (unit === 'month') {
        return new Intl.DateTimeFormat('ru-RU', { month: 'short', year: '2-digit', timeZone: tz }).format(date);
    }
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: tz }).format(date);
}

export async function getFinanceAnalytics(
    input: FinanceAnalyticsInput,
): Promise<ServiceResult<FinanceAnalytics>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;
    const access = await checkBusinessAccess(input.businessId, user.id);
    if (!access) return FORBIDDEN;

    const [biz] = await db
        .select({ tz: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, input.businessId))
        .limit(1);
    const tz = biz?.tz ?? 'UTC';

    const from = dayjs.tz(input.fromDate, tz).startOf('day');
    const toExclusive = dayjs.tz(input.toDate, tz).startOf('day').add(1, 'day');
    if (!from.isValid() || !toExclusive.isValid() || !toExclusive.isAfter(from)) {
        return { ok: false, error: 'Некорректный период', code: 'INVALID_RANGE' };
    }

    const conditions = [
        eq(appointments.businessId, input.businessId),
        gte(appointments.startsAt, from.toDate()),
        lt(appointments.startsAt, toExclusive.toDate()),
    ];
    if (input.employeeUserId === null) {
        conditions.push(isNull(appointments.employeeUserId));
    } else if (input.employeeUserId !== undefined) {
        conditions.push(eq(appointments.employeeUserId, input.employeeUserId));
    }

    const [rows, team] = await Promise.all([
        db
            .select()
            .from(appointments)
            .where(and(...conditions))
            .orderBy(asc(appointments.startsAt)),
        getBusinessTeam(input.businessId),
    ]);

    return {
        ok: true,
        data: aggregate(rows, team, tz, input.granularity, input.fromDate, input.toDate),
    };
}

function aggregate(
    rows: Appointment[],
    team: { id: string; name: string }[],
    tz: string,
    granularity: FinanceGranularity,
    fromDate: string,
    toDate: string,
): FinanceAnalytics {
    const teamNames = new Map(team.map((m) => [m.id, m.name]));
    const now = Date.now();

    const summary: FinanceSummary = {
        revenue: 0,
        pending: 0,
        lost: 0,
        completedCount: 0,
        scheduledCount: 0,
        cancelledCount: 0,
        noShowCount: 0,
        clients: 0,
        avgCheck: 0,
        unconfirmed: 0,
    };
    const completedClients = new Set<string>();
    const currencyCount = new Map<string, number>();

    // Пустые бакеты тоже показываем (нулями) — ровный график без «дыр».
    const unit = bucketUnitFor(granularity, fromDate, toDate);
    const startUnit: dayjs.OpUnitType = unit === 'hour' ? 'day' : unit;
    const from = dayjs.tz(fromDate, tz).startOf(startUnit);
    const toExclusive = dayjs.tz(toDate, tz).startOf('day').add(1, 'day');
    const bucketOf = new Map<string, FinancePoint>();
    const order: string[] = [];
    for (let cursor = from; cursor.isBefore(toExclusive); cursor = cursor.add(1, unit)) {
        const key = cursor.toISOString();
        order.push(key);
        bucketOf.set(key, { label: labelFor(cursor, unit, tz), revenue: 0, pending: 0, count: 0 });
    }

    const employeeStats = new Map<string | null, FinanceEmployeeStat>();
    const ensureEmployee = (id: string | null): FinanceEmployeeStat => {
        const existing = employeeStats.get(id);
        if (existing) return existing;
        const stat: FinanceEmployeeStat = {
            employeeId: id,
            name: id ? (teamNames.get(id) ?? 'Бывший сотрудник') : 'Без сотрудника',
            revenue: 0,
            completed: 0,
            scheduled: 0,
        };
        employeeStats.set(id, stat);
        return stat;
    };

    for (const r of rows) {
        currencyCount.set(r.currency, (currencyCount.get(r.currency) ?? 0) + 1);
        const point = bucketOf.get(dayjs(r.startsAt).tz(tz).startOf(unit).toISOString());
        const emp = ensureEmployee(r.employeeUserId);
        if (point) point.count += 1;

        switch (r.status) {
            case 'completed':
                summary.revenue += r.amount;
                summary.completedCount += 1;
                completedClients.add(r.clientId);
                emp.revenue += r.amount;
                emp.completed += 1;
                if (point) point.revenue += r.amount;
                break;
            case 'scheduled':
                summary.pending += r.amount;
                summary.scheduledCount += 1;
                emp.scheduled += 1;
                if (point) point.pending += r.amount;
                if (r.endsAt.getTime() < now) summary.unconfirmed += 1;
                break;
            case 'cancelled':
                summary.lost += r.amount;
                summary.cancelledCount += 1;
                break;
            case 'no_show':
                summary.lost += r.amount;
                summary.noShowCount += 1;
                break;
        }
    }

    summary.clients = completedClients.size;
    summary.avgCheck =
        summary.completedCount > 0 ? Math.round(summary.revenue / summary.completedCount) : 0;

    let currency = 'KZT';
    let max = 0;
    for (const [cur, n] of currencyCount) {
        if (n > max) {
            max = n;
            currency = cur;
        }
    }

    const byEmployee = [...employeeStats.values()].sort((a, b) => b.revenue - a.revenue);

    return {
        currency,
        summary,
        series: order.map((k) => bucketOf.get(k)!),
        byEmployee,
        byStatus: {
            completed: summary.completedCount,
            scheduled: summary.scheduledCount,
            cancelled: summary.cancelledCount,
            no_show: summary.noShowCount,
        },
    };
}
