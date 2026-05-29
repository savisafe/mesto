import 'server-only';
import { and, asc, eq, gt, gte, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
    appointments,
    services,
    clients,
    users,
    businessMembers,
    businesses,
    type Appointment,
    type AppointmentStatus,
} from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { checkBusinessAccess } from './_access';

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const FORBIDDEN = { ok: false as const, error: 'Нет доступа', code: 'FORBIDDEN' as const };
const NOT_FOUND = { ok: false as const, error: 'Запись не найдена', code: 'NOT_FOUND' as const };

export interface AppointmentDetail {
    id: string;
    businessId: string;
    status: AppointmentStatus;
    startsAt: Date;
    endsAt: Date;
    amount: number;
    currency: string;
    notes: string | null;
    client: { id: string; name: string; phone: string };
    service: { id: string; name: string } | null;
    employee: { id: string; name: string } | null;
}

export interface ListAppointmentsInput {
    businessId: string;
    /** Включительно: ISO дата-время начала окна */
    from: Date;
    /** Исключительно: ISO дата-время конца окна */
    to: Date;
    employeeUserId?: string | null; // null = только без сотрудника, undefined = все
}

export interface CreateAppointmentInput {
    businessId: string;
    clientId: string;
    serviceId?: string | null;
    employeeUserId?: string | null;
    startsAt: Date;
    durationMinutes: number;
    amount?: number;
    currency?: string;
    notes?: string;
}

export interface UpdateAppointmentInput {
    serviceId?: string | null;
    employeeUserId?: string | null;
    startsAt?: Date;
    durationMinutes?: number;
    amount?: number;
    notes?: string | null;
    status?: AppointmentStatus;
}

async function loadDetails(rows: Appointment[]): Promise<AppointmentDetail[]> {
    if (rows.length === 0) return [];
    const clientIds = Array.from(new Set(rows.map((r) => r.clientId)));
    const serviceIds = Array.from(
        new Set(rows.map((r) => r.serviceId).filter((id): id is string => id !== null)),
    );
    const employeeIds = Array.from(
        new Set(rows.map((r) => r.employeeUserId).filter((id): id is string => id !== null)),
    );

    const [clientRows, serviceRows, employeeRows] = await Promise.all([
        clientIds.length > 0
            ? db
                  .select({ id: clients.id, name: clients.name, phone: clients.phone })
                  .from(clients)
                  .where(or(...clientIds.map((id) => eq(clients.id, id))))
            : Promise.resolve([]),
        serviceIds.length > 0
            ? db
                  .select({ id: services.id, name: services.name })
                  .from(services)
                  .where(or(...serviceIds.map((id) => eq(services.id, id))))
            : Promise.resolve([]),
        employeeIds.length > 0
            ? db
                  .select({ id: users.id, name: users.name })
                  .from(users)
                  .where(or(...employeeIds.map((id) => eq(users.id, id))))
            : Promise.resolve([]),
    ]);

    const clientMap = new Map(clientRows.map((c) => [c.id, c]));
    const serviceMap = new Map(serviceRows.map((s) => [s.id, s]));
    const employeeMap = new Map(employeeRows.map((e) => [e.id, e]));

    return rows.map((r) => ({
        id: r.id,
        businessId: r.businessId,
        status: r.status,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        amount: r.amount,
        currency: r.currency,
        notes: r.notes,
        client: clientMap.get(r.clientId) ?? { id: r.clientId, name: '?', phone: '' },
        service: r.serviceId ? (serviceMap.get(r.serviceId) ?? null) : null,
        employee: r.employeeUserId ? (employeeMap.get(r.employeeUserId) ?? null) : null,
    }));
}

export async function listAppointments(
    input: ListAppointmentsInput,
): Promise<ServiceResult<AppointmentDetail[]>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;
    const access = await checkBusinessAccess(input.businessId, user.id);
    if (!access) return FORBIDDEN;

    const conditions = [
        eq(appointments.businessId, input.businessId),
        gte(appointments.startsAt, input.from),
        lt(appointments.startsAt, input.to),
    ];
    if (input.employeeUserId === null) {
        conditions.push(isNull(appointments.employeeUserId));
    } else if (input.employeeUserId !== undefined) {
        conditions.push(eq(appointments.employeeUserId, input.employeeUserId));
    }

    const rows = await db
        .select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(asc(appointments.startsAt));

    return { ok: true, data: await loadDetails(rows) };
}

// Проверяет нет ли пересечения у того же сотрудника в интервале [startsAt, endsAt).
// Игнорирует cancelled/no_show и саму запись (для update).
async function hasConflict(
    businessId: string,
    employeeUserId: string,
    startsAt: Date,
    endsAt: Date,
    excludeAppointmentId?: string,
): Promise<boolean> {
    const conditions = [
        eq(appointments.businessId, businessId),
        eq(appointments.employeeUserId, employeeUserId),
        or(eq(appointments.status, 'scheduled'), eq(appointments.status, 'completed')),
        // [existing.startsAt, existing.endsAt) пересекается с [startsAt, endsAt)
        // ⇔ existing.startsAt < endsAt AND existing.endsAt > startsAt
        lt(appointments.startsAt, endsAt),
        gt(appointments.endsAt, startsAt),
    ];
    if (excludeAppointmentId) {
        conditions.push(sql`${appointments.id} <> ${excludeAppointmentId}`);
    }
    const [hit] = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(and(...conditions))
        .limit(1);
    return !!hit;
}

async function ensureEmployeeOfBusiness(
    businessId: string,
    employeeUserId: string,
): Promise<boolean> {
    if (!employeeUserId) return true;
    const [biz] = await db
        .select({ ownerId: businesses.ownerId })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
    if (!biz) return false;
    if (biz.ownerId === employeeUserId) return true;
    const [member] = await db
        .select({ userId: businessMembers.userId })
        .from(businessMembers)
        .where(
            and(
                eq(businessMembers.businessId, businessId),
                eq(businessMembers.userId, employeeUserId),
            ),
        )
        .limit(1);
    return !!member;
}

async function ensureClientOfBusiness(businessId: string, clientId: string): Promise<boolean> {
    const [c] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.businessId, businessId)))
        .limit(1);
    return !!c;
}

export async function createAppointment(
    input: CreateAppointmentInput,
): Promise<ServiceResult<AppointmentDetail>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;
    const access = await checkBusinessAccess(input.businessId, user.id);
    if (!access) return FORBIDDEN;

    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0 || input.durationMinutes > 43200) {
        return { ok: false, error: 'Длительность от 1 минуты до 30 дней', code: 'INVALID_DURATION' };
    }
    if (!(input.startsAt instanceof Date) || isNaN(input.startsAt.getTime())) {
        return { ok: false, error: 'Некорректная дата начала', code: 'INVALID_STARTS_AT' };
    }

    if (!(await ensureClientOfBusiness(input.businessId, input.clientId))) {
        return { ok: false, error: 'Клиент не принадлежит этому бизнесу', code: 'INVALID_CLIENT' };
    }

    let amount = input.amount ?? 0;
    let currency = input.currency ?? 'KZT';
    if (input.serviceId) {
        const [svc] = await db
            .select()
            .from(services)
            .where(and(eq(services.id, input.serviceId), eq(services.businessId, input.businessId)))
            .limit(1);
        if (!svc) {
            return { ok: false, error: 'Услуга не найдена', code: 'INVALID_SERVICE' };
        }
        // если amount не передан — берём из услуги (зафиксируем цену на момент записи)
        if (input.amount === undefined) {
            amount = svc.amount;
            currency = svc.currency;
        }
    }

    if (input.employeeUserId) {
        if (!(await ensureEmployeeOfBusiness(input.businessId, input.employeeUserId))) {
            return { ok: false, error: 'Сотрудник не в этом бизнесе', code: 'INVALID_EMPLOYEE' };
        }
    }

    const endsAt = new Date(input.startsAt.getTime() + input.durationMinutes * 60_000);

    if (input.employeeUserId) {
        const conflict = await hasConflict(
            input.businessId,
            input.employeeUserId,
            input.startsAt,
            endsAt,
        );
        if (conflict) {
            return {
                ok: false,
                error: 'У сотрудника уже есть запись в это время',
                code: 'SLOT_CONFLICT',
            };
        }
    }

    const [created] = await db
        .insert(appointments)
        .values({
            businessId: input.businessId,
            clientId: input.clientId,
            serviceId: input.serviceId ?? null,
            employeeUserId: input.employeeUserId ?? null,
            startsAt: input.startsAt,
            endsAt,
            amount,
            currency,
            notes: input.notes?.trim() || null,
        })
        .returning();

    const [detail] = await loadDetails([created]);
    return { ok: true, data: detail };
}

export async function updateAppointment(
    id: string,
    input: UpdateAppointmentInput,
): Promise<ServiceResult<AppointmentDetail>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const [existing] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    if (!existing) return NOT_FOUND;
    const access = await checkBusinessAccess(existing.businessId, user.id);
    if (!access) return FORBIDDEN;

    const updates: Partial<typeof appointments.$inferInsert> = {};

    const nextStartsAt = input.startsAt ?? existing.startsAt;
    const nextDuration =
        input.durationMinutes ??
        Math.round((existing.endsAt.getTime() - existing.startsAt.getTime()) / 60_000);
    const nextEndsAt = new Date(nextStartsAt.getTime() + nextDuration * 60_000);
    const nextEmployee = input.employeeUserId !== undefined ? input.employeeUserId : existing.employeeUserId;

    if (input.startsAt !== undefined || input.durationMinutes !== undefined) {
        if (!Number.isInteger(nextDuration) || nextDuration <= 0 || nextDuration > 43200) {
            return { ok: false, error: 'Длительность от 1 минуты до 30 дней', code: 'INVALID_DURATION' };
        }
        updates.startsAt = nextStartsAt;
        updates.endsAt = nextEndsAt;
    }
    if (input.employeeUserId !== undefined) {
        if (input.employeeUserId && !(await ensureEmployeeOfBusiness(existing.businessId, input.employeeUserId))) {
            return { ok: false, error: 'Сотрудник не в этом бизнесе', code: 'INVALID_EMPLOYEE' };
        }
        updates.employeeUserId = input.employeeUserId;
    }
    if (input.serviceId !== undefined) {
        if (input.serviceId) {
            const [svc] = await db
                .select({ id: services.id })
                .from(services)
                .where(and(eq(services.id, input.serviceId), eq(services.businessId, existing.businessId)))
                .limit(1);
            if (!svc) return { ok: false, error: 'Услуга не найдена', code: 'INVALID_SERVICE' };
        }
        updates.serviceId = input.serviceId;
    }
    if (input.amount !== undefined) {
        if (!Number.isInteger(input.amount) || input.amount < 0) {
            return { ok: false, error: 'Некорректная цена', code: 'INVALID_AMOUNT' };
        }
        updates.amount = input.amount;
    }
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;
    if (input.status !== undefined) updates.status = input.status;

    // Проверка конфликта если меняется время/сотрудник и статус всё ещё активный
    const newStatus = input.status ?? existing.status;
    if (
        nextEmployee &&
        (newStatus === 'scheduled' || newStatus === 'completed') &&
        (updates.startsAt !== undefined || updates.employeeUserId !== undefined)
    ) {
        const conflict = await hasConflict(
            existing.businessId,
            nextEmployee,
            nextStartsAt,
            nextEndsAt,
            id,
        );
        if (conflict) {
            return {
                ok: false,
                error: 'У сотрудника уже есть запись в это время',
                code: 'SLOT_CONFLICT',
            };
        }
    }

    const [updated] = await db
        .update(appointments)
        .set(updates)
        .where(eq(appointments.id, id))
        .returning();
    const [detail] = await loadDetails([updated]);
    return { ok: true, data: detail };
}

export async function cancelAppointment(id: string): Promise<ServiceResult<{ id: string }>> {
    return setStatus(id, 'cancelled');
}

export async function completeAppointment(id: string): Promise<ServiceResult<{ id: string }>> {
    return setStatus(id, 'completed');
}

async function setStatus(
    id: string,
    status: AppointmentStatus,
): Promise<ServiceResult<{ id: string }>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const [existing] = await db
        .select({ businessId: appointments.businessId, status: appointments.status })
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);
    if (!existing) return NOT_FOUND;
    const access = await checkBusinessAccess(existing.businessId, user.id);
    if (!access) return FORBIDDEN;

    if (existing.status === status) {
        return { ok: true, data: { id } };
    }
    await db.update(appointments).set({ status }).where(eq(appointments.id, id));
    return { ok: true, data: { id } };
}

// Утилита для тестов и UI: добавить N минут к дате не мутируя её
export function addMinutes(d: Date, m: number): Date {
    return new Date(d.getTime() + m * 60_000);
}
