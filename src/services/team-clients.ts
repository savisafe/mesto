import 'server-only';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { appointments, clients, businessMembers, businesses, users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { getBusinessRole } from './_access';

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const FORBIDDEN = { ok: false as const, error: 'Нет доступа', code: 'FORBIDDEN' as const };

export interface EmployeeClientRow {
    client: { id: string; name: string; phone: string };
    // Завершённые визиты у этого сотрудника.
    visits: number;
    // Дата последнего завершённого визита у этого сотрудника (null — ещё не было).
    lastVisitAt: Date | null;
    // Сумма по завершённым визитам у этого сотрудника.
    revenue: number;
    currency: string;
    // Клиент ходит ещё к другим сотрудникам этого бизнеса (не эксклюзивен).
    otherEmployees: boolean;
}

export interface EmployeeClientsGroup {
    // null — записи без назначенного сотрудника («любой свободный»).
    employee: { id: string; name: string } | null;
    clients: EmployeeClientRow[];
}

// Агрегат по (сотрудник, клиент): из неотменённых записей.
interface AggRow {
    employeeUserId: string | null;
    clientId: string;
    visits: number;
    lastVisitAt: Date | null;
    revenue: number;
    currency: string;
}

function sortClients(rows: EmployeeClientRow[]): EmployeeClientRow[] {
    return [...rows].sort((a, b) => {
        const at = a.lastVisitAt?.getTime() ?? 0;
        const bt = b.lastVisitAt?.getTime() ?? 0;
        if (bt !== at) return bt - at; // недавние выше; «не было визита» (0) — ниже
        if (b.visits !== a.visits) return b.visits - a.visits;
        return a.client.name.localeCompare(b.client.name, 'ru');
    });
}

// Разбивка «сотрудник → его клиенты». Один клиент может попадать к нескольким
// сотрудникам (помечается otherEmployees). Доступно только владельцу/менеджеру —
// показывает выручку, поэтому EMPLOYEE сюда не пускаем.
export async function getClientsByEmployee(
    businessId: string,
): Promise<ServiceResult<EmployeeClientsGroup[]>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const role = await getBusinessRole(businessId, user.id);
    if (role !== 'OWNER' && role !== 'MANAGER') return FORBIDDEN;

    // Команда (владелец + участники) — чтобы показать в т.ч. сотрудников без клиентов
    // и сохранить осмысленный порядок.
    const [owner] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .innerJoin(businesses, eq(businesses.ownerId, users.id))
        .where(eq(businesses.id, businessId))
        .limit(1);
    const memberRows = await db
        .select({ id: users.id, name: users.name })
        .from(businessMembers)
        .innerJoin(users, eq(users.id, businessMembers.userId))
        .where(eq(businessMembers.businessId, businessId))
        .orderBy(users.name);

    const teamOrder = [...(owner ? [owner] : []), ...memberRows];
    const empName = new Map(teamOrder.map((m) => [m.id, m.name]));

    const aggRows = (await db
        .select({
            employeeUserId: appointments.employeeUserId,
            clientId: appointments.clientId,
            visits: sql<number>`count(*) filter (where ${appointments.status} = 'completed')::int`,
            lastVisitAt: sql<
                Date | null
            >`max(${appointments.startsAt}) filter (where ${appointments.status} = 'completed')`,
            revenue: sql<number>`coalesce(sum(${appointments.amount}) filter (where ${appointments.status} = 'completed'), 0)::int`,
            currency: sql<string>`coalesce(max(${appointments.currency}), 'KZT')`,
        })
        .from(appointments)
        .where(and(eq(appointments.businessId, businessId), ne(appointments.status, 'cancelled')))
        .groupBy(appointments.employeeUserId, appointments.clientId)) as AggRow[];

    if (aggRows.length === 0) {
        return { ok: true, data: teamOrder.map((m) => ({ employee: m, clients: [] })) };
    }

    // Данные клиентов одним запросом.
    const clientIds = Array.from(new Set(aggRows.map((r) => r.clientId)));
    const clientRows = await db
        .select({ id: clients.id, name: clients.name, phone: clients.phone })
        .from(clients)
        .where(and(eq(clients.businessId, businessId), inArray(clients.id, clientIds)));
    const clientMap = new Map(clientRows.map((c) => [c.id, c]));

    // У скольких разных (named) сотрудников был клиент — для метки otherEmployees.
    const employeesPerClient = new Map<string, Set<string>>();
    for (const r of aggRows) {
        if (!r.employeeUserId) continue;
        const set = employeesPerClient.get(r.clientId) ?? new Set<string>();
        set.add(r.employeeUserId);
        employeesPerClient.set(r.clientId, set);
    }

    // Имена сотрудников, которых нет в текущей команде (например, удалённых).
    const extraEmpIds = Array.from(
        new Set(
            aggRows
                .map((r) => r.employeeUserId)
                .filter((id): id is string => id !== null && !empName.has(id)),
        ),
    );
    if (extraEmpIds.length > 0) {
        const extra = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(inArray(users.id, extraEmpIds));
        for (const e of extra) empName.set(e.id, e.name);
    }

    // Группируем строки по сотруднику (ключ '' — без сотрудника).
    const byEmployee = new Map<string, EmployeeClientRow[]>();
    for (const r of aggRows) {
        const client = clientMap.get(r.clientId);
        if (!client) continue; // на всякий случай
        const key = r.employeeUserId ?? '';
        const list = byEmployee.get(key) ?? [];
        list.push({
            client,
            visits: r.visits,
            lastVisitAt: r.lastVisitAt ? new Date(r.lastVisitAt) : null,
            revenue: r.revenue,
            currency: r.currency,
            otherEmployees: (employeesPerClient.get(r.clientId)?.size ?? 0) > 1,
        });
        byEmployee.set(key, list);
    }

    const groups: EmployeeClientsGroup[] = [];

    // Сначала команда в своём порядке (включая тех, у кого 0 клиентов).
    for (const m of teamOrder) {
        groups.push({ employee: m, clients: sortClients(byEmployee.get(m.id) ?? []) });
        byEmployee.delete(m.id);
    }
    // Затем сотрудники не из текущей команды (удалённые), у кого есть клиенты.
    for (const [empId, list] of byEmployee) {
        if (empId === '') continue;
        groups.push({
            employee: { id: empId, name: empName.get(empId) ?? 'Бывший сотрудник' },
            clients: sortClients(list),
        });
    }
    // В конце — записи без сотрудника.
    const unassigned = byEmployee.get('');
    if (unassigned && unassigned.length > 0) {
        groups.push({ employee: null, clients: sortClients(unassigned) });
    }

    return { ok: true, data: groups };
}
