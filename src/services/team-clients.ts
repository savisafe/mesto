import 'server-only';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { appointments, clients, users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { getBusinessRole } from './_access';

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const FORBIDDEN = { ok: false as const, error: 'Нет доступа', code: 'FORBIDDEN' as const };
const NOT_FOUND = { ok: false as const, error: 'Клиент не найден', code: 'NOT_FOUND' as const };

export interface ClientEmployeeStat {
    // null — записи без назначенного сотрудника («любой свободный»).
    employee: { id: string; name: string } | null;
    visits: number;
    lastVisitAt: Date | null;
    revenue: number;
    currency: string;
}

export interface ClientStats {
    client: { id: string; name: string; phone: string };
    // Итого по клиенту (по всем сотрудникам).
    totalVisits: number;
    lastVisitAt: Date | null;
    totalRevenue: number;
    currency: string;
    // Разрез по сотрудникам — клиент может ходить к разным.
    byEmployee: ClientEmployeeStat[];
}

interface AggRow {
    employeeUserId: string | null;
    visits: number;
    lastVisitAt: Date | null;
    revenue: number;
    currency: string;
}

// Статистика по клиенту: визиты, последний визит, выручка — всего и по
// сотрудникам. Видна только владельцу/менеджеру (показывает выручку).
export async function getClientStats(
    businessId: string,
    clientId: string,
): Promise<ServiceResult<ClientStats>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const role = await getBusinessRole(businessId, user.id);
    if (role !== 'OWNER' && role !== 'MANAGER') return FORBIDDEN;

    const [client] = await db
        .select({ id: clients.id, name: clients.name, phone: clients.phone })
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.businessId, businessId)))
        .limit(1);
    if (!client) return NOT_FOUND;

    // Агрегат по сотруднику: визиты/выручка/последний визит — по завершённым,
    // из неотменённых записей этого клиента.
    const aggRows = (await db
        .select({
            employeeUserId: appointments.employeeUserId,
            visits: sql<number>`count(*) filter (where ${appointments.status} = 'completed')::int`,
            lastVisitAt: sql<
                Date | null
            >`max(${appointments.startsAt}) filter (where ${appointments.status} = 'completed')`,
            revenue: sql<number>`coalesce(sum(${appointments.amount}) filter (where ${appointments.status} = 'completed'), 0)::int`,
            currency: sql<string>`coalesce(max(${appointments.currency}), 'KZT')`,
        })
        .from(appointments)
        .where(
            and(
                eq(appointments.businessId, businessId),
                eq(appointments.clientId, clientId),
                ne(appointments.status, 'cancelled'),
            ),
        )
        .groupBy(appointments.employeeUserId)) as AggRow[];

    // Имена сотрудников.
    const empIds = aggRows
        .map((r) => r.employeeUserId)
        .filter((id): id is string => id !== null);
    const empRows = empIds.length
        ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, empIds))
        : [];
    const empName = new Map(empRows.map((e) => [e.id, e.name]));

    const byEmployee: ClientEmployeeStat[] = aggRows.map((r) => ({
        employee: r.employeeUserId
            ? { id: r.employeeUserId, name: empName.get(r.employeeUserId) ?? 'Сотрудник' }
            : null,
        visits: r.visits,
        lastVisitAt: r.lastVisitAt ? new Date(r.lastVisitAt) : null,
        revenue: r.revenue,
        currency: r.currency,
    }));

    // Сортировка: по последнему визиту (недавние выше), затем по визитам.
    byEmployee.sort((a, b) => {
        const at = a.lastVisitAt?.getTime() ?? 0;
        const bt = b.lastVisitAt?.getTime() ?? 0;
        if (bt !== at) return bt - at;
        return b.visits - a.visits;
    });

    const totalVisits = byEmployee.reduce((s, r) => s + r.visits, 0);
    const totalRevenue = byEmployee.reduce((s, r) => s + r.revenue, 0);
    const lastVisitAt = byEmployee.reduce<Date | null>((acc, r) => {
        if (!r.lastVisitAt) return acc;
        return !acc || r.lastVisitAt > acc ? r.lastVisitAt : acc;
    }, null);
    const currency = byEmployee.find((r) => r.currency)?.currency ?? 'KZT';

    return {
        ok: true,
        data: { client, totalVisits, lastVisitAt, totalRevenue, currency, byEmployee },
    };
}
