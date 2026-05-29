import 'server-only';
import { and, asc, eq, gte, inArray, or } from 'drizzle-orm';
import { db } from '@/db';
import {
    appointments,
    businesses,
    clients,
    services,
    users,
    type Appointment,
    type AppointmentStatus,
} from '@/db/schema';
import { validateSlot, getBusinessTeam, type ValidateSlotCode } from '../availability';
import { findOrCreateClient } from './clients';

const DEFAULT_CURRENCY = 'KZT';

export type ExternalBookingErrorCode =
    | 'INVALID_PAYLOAD'
    | 'BUSINESS_INACTIVE'
    | 'NOT_FOUND'
    | ValidateSlotCode;

export interface CreateExternalBookingInput {
    businessId: string;
    idempotencyKey: string;
    serviceExternalId?: string | null;
    serviceName: string;
    startsAt: Date;
    durationMinutes: number;
    /** `null`/undefined = «уточняется» (хранится как 0). */
    amount?: number | null;
    currency?: string | null;
    client: { name: string; phone: string; telegramId?: string | null };
    masterId?: string | null;
    masterName?: string | null;
    notes?: string | null;
}

export interface ExternalBookingCreated {
    ok: true;
    appointmentId: string;
    clientId: string;
    clientCreated: boolean;
    serviceMatched: boolean;
    masterMatched: boolean;
    idempotentReplay: boolean;
    startsAt: Date;
    endsAt: Date;
}

export type ExternalBookingError = {
    ok: false;
    code: ExternalBookingErrorCode;
    error: string;
    field?: string;
};

export type CreateExternalBookingResult = ExternalBookingCreated | ExternalBookingError;

export interface ExternalBookingDetail {
    appointmentId: string;
    status: AppointmentStatus;
    startsAt: Date;
    endsAt: Date;
    amount: number;
    currency: string;
    notes: string | null;
    client: { id: string; name: string; phone: string };
    service: { id: string; name: string } | null;
    master: { id: string; name: string } | null;
    createdAt: Date;
}

const norm = (s: string) => s.trim().toLowerCase();

export async function matchService(businessId: string, externalId: string | null, name: string) {
    if (externalId) {
        const [s] = await db
            .select()
            .from(services)
            .where(and(eq(services.businessId, businessId), eq(services.externalId, externalId)))
            .limit(1);
        if (s) return s;
    }
    if (name) {
        const [s] = await db
            .select()
            .from(services)
            .where(and(eq(services.businessId, businessId), eq(services.name, name)))
            .limit(1);
        if (s) return s;
    }
    return undefined;
}

export async function matchMaster(
    businessId: string,
    masterId: string | null,
    masterName: string | null,
): Promise<string | null> {
    const team = await getBusinessTeam(businessId);
    if (masterId) {
        return team.some((t) => t.id === masterId) ? masterId : null;
    }
    if (masterName) {
        const hit = team.find((t) => norm(t.name) === norm(masterName));
        return hit?.id ?? null;
    }
    return null;
}

function errorFor(code: ValidateSlotCode): ExternalBookingError {
    switch (code) {
        case 'OUT_OF_HOURS':
            return { ok: false, code, error: 'starts_at вне рабочих часов', field: 'starts_at' };
        case 'BLOCKED':
            return { ok: false, code, error: 'Время заблокировано (перерыв/выходной)', field: 'starts_at' };
        case 'SLOT_CONFLICT':
            return { ok: false, code, error: 'Слот уже занят' };
    }
}

function replay(appt: Appointment): ExternalBookingCreated {
    return {
        ok: true,
        appointmentId: appt.id,
        clientId: appt.clientId,
        clientCreated: false,
        serviceMatched: appt.serviceId !== null,
        masterMatched: appt.employeeUserId !== null,
        idempotentReplay: true,
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
    };
}

async function findByIdempotencyKey(
    businessId: string,
    key: string,
): Promise<Appointment | undefined> {
    const [row] = await db
        .select()
        .from(appointments)
        .where(
            and(
                eq(appointments.businessId, businessId),
                eq(appointments.externalIdempotencyKey, key),
            ),
        )
        .limit(1);
    return row;
}

export async function createExternalBooking(
    input: CreateExternalBookingInput,
): Promise<CreateExternalBookingResult> {
    const [biz] = await db
        .select({ isActive: businesses.isActive })
        .from(businesses)
        .where(eq(businesses.id, input.businessId))
        .limit(1);
    if (!biz) return { ok: false, code: 'NOT_FOUND', error: 'Бизнес не найден' };
    if (!biz.isActive) return { ok: false, code: 'BUSINESS_INACTIVE', error: 'Бизнес неактивен' };

    // Идемпотентность: повтор по существующему ключу → прежний результат.
    const existing = await findByIdempotencyKey(input.businessId, input.idempotencyKey);
    if (existing) return replay(existing);

    if (
        !Number.isInteger(input.durationMinutes) ||
        input.durationMinutes < 1 ||
        input.durationMinutes > 1440
    ) {
        return {
            ok: false,
            code: 'INVALID_PAYLOAD',
            error: 'duration_minutes должен быть 1..1440',
            field: 'duration_minutes',
        };
    }
    if (!(input.startsAt instanceof Date) || isNaN(input.startsAt.getTime())) {
        return { ok: false, code: 'INVALID_PAYLOAD', error: 'Некорректный starts_at', field: 'starts_at' };
    }

    const svc = await matchService(
        input.businessId,
        input.serviceExternalId?.trim() || null,
        input.serviceName.trim(),
    );
    const serviceMatched = !!svc;
    let amount = input.amount ?? 0;
    let currency = input.currency ?? DEFAULT_CURRENCY;
    if (svc && input.amount == null) {
        amount = svc.amount;
        currency = input.currency ?? svc.currency;
    }

    const employeeUserId = await matchMaster(
        input.businessId,
        input.masterId?.trim() || null,
        input.masterName?.trim() || null,
    );
    const masterMatched = employeeUserId !== null;

    const slot = await validateSlot({
        businessId: input.businessId,
        employeeUserId,
        startsAt: input.startsAt,
        durationMinutes: input.durationMinutes,
    });
    if (!slot.ok) return errorFor(slot.code);

    const { client, created } = await findOrCreateClient({
        businessId: input.businessId,
        name: input.client.name,
        phone: input.client.phone,
        telegramId: input.client.telegramId,
    });

    const endsAt = new Date(input.startsAt.getTime() + input.durationMinutes * 60_000);
    try {
        const [appt] = await db
            .insert(appointments)
            .values({
                businessId: input.businessId,
                clientId: client.id,
                serviceId: svc?.id ?? null,
                employeeUserId,
                startsAt: input.startsAt,
                endsAt,
                amount,
                currency,
                notes: input.notes?.trim() || null,
                source: 'external',
                externalIdempotencyKey: input.idempotencyKey,
            })
            .returning();
        return {
            ok: true,
            appointmentId: appt.id,
            clientId: client.id,
            clientCreated: created,
            serviceMatched,
            masterMatched,
            idempotentReplay: false,
            startsAt: appt.startsAt,
            endsAt: appt.endsAt,
        };
    } catch (e) {
        // Гонка по idempotency_key: параллельный запрос успел вставить первым.
        const raced = await findByIdempotencyKey(input.businessId, input.idempotencyKey);
        if (raced) return replay(raced);
        throw e;
    }
}

async function toDetail(appt: Appointment): Promise<ExternalBookingDetail> {
    const [client] = await db
        .select({ id: clients.id, name: clients.name, phone: clients.phone })
        .from(clients)
        .where(eq(clients.id, appt.clientId))
        .limit(1);

    let service: { id: string; name: string } | null = null;
    if (appt.serviceId) {
        const [s] = await db
            .select({ id: services.id, name: services.name })
            .from(services)
            .where(eq(services.id, appt.serviceId))
            .limit(1);
        service = s ?? null;
    }

    let master: { id: string; name: string } | null = null;
    if (appt.employeeUserId) {
        const [u] = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, appt.employeeUserId))
            .limit(1);
        master = u ?? null;
    }

    return {
        appointmentId: appt.id,
        status: appt.status,
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
        amount: appt.amount,
        currency: appt.currency,
        notes: appt.notes,
        client: client ?? { id: appt.clientId, name: '?', phone: '' },
        service,
        master,
        createdAt: appt.createdAt,
    };
}

/** Запись по id в рамках бизнеса ключа (чужой бизнес → null). */
export async function getExternalBooking(
    businessId: string,
    appointmentId: string,
): Promise<ExternalBookingDetail | null> {
    const [appt] = await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.id, appointmentId), eq(appointments.businessId, businessId)))
        .limit(1);
    return appt ? toDetail(appt) : null;
}

export type CancelReason = 'client_cancelled' | 'rescheduled' | 'bot_false_trigger';

/**
 * Отмена записи. Идемпотентна: повторная отмена уже отменённой — успех.
 * `reason` пока не персистится (нет колонки) — валидируется на уровне роута.
 */
export async function cancelExternalBooking(
    businessId: string,
    appointmentId: string,
): Promise<ExternalBookingError | { ok: true; appointmentId: string; status: AppointmentStatus }> {
    const [appt] = await db
        .select({ id: appointments.id, status: appointments.status })
        .from(appointments)
        .where(and(eq(appointments.id, appointmentId), eq(appointments.businessId, businessId)))
        .limit(1);
    if (!appt) return { ok: false, code: 'NOT_FOUND', error: 'Запись не найдена' };
    if (appt.status !== 'cancelled') {
        await db
            .update(appointments)
            .set({ status: 'cancelled' })
            .where(eq(appointments.id, appointmentId));
    }
    return { ok: true, appointmentId, status: 'cancelled' };
}

export interface UpdateExternalBookingInput {
    startsAt?: Date;
    durationMinutes?: number;
    serviceExternalId?: string | null;
    serviceName?: string | null;
    masterId?: string | null;
    masterName?: string | null;
    notes?: string | null;
}

/** Перенос/изменение записи. Время/мастер ревалидируются как при создании. */
export async function updateExternalBooking(
    businessId: string,
    appointmentId: string,
    patch: UpdateExternalBookingInput,
): Promise<ExternalBookingError | { ok: true; detail: ExternalBookingDetail }> {
    const [existing] = await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.id, appointmentId), eq(appointments.businessId, businessId)))
        .limit(1);
    if (!existing) return { ok: false, code: 'NOT_FOUND', error: 'Запись не найдена' };

    if (patch.startsAt && (!(patch.startsAt instanceof Date) || isNaN(patch.startsAt.getTime()))) {
        return { ok: false, code: 'INVALID_PAYLOAD', error: 'Некорректный starts_at', field: 'starts_at' };
    }

    const existingDuration = Math.round(
        (existing.endsAt.getTime() - existing.startsAt.getTime()) / 60_000,
    );
    const nextStartsAt = patch.startsAt ?? existing.startsAt;
    const nextDuration = patch.durationMinutes ?? existingDuration;
    if (!Number.isInteger(nextDuration) || nextDuration < 1 || nextDuration > 1440) {
        return {
            ok: false,
            code: 'INVALID_PAYLOAD',
            error: 'duration_minutes должен быть 1..1440',
            field: 'duration_minutes',
        };
    }

    const masterProvided = patch.masterId !== undefined || patch.masterName !== undefined;
    const nextEmployee = masterProvided
        ? await matchMaster(businessId, patch.masterId?.trim() || null, patch.masterName?.trim() || null)
        : existing.employeeUserId;

    const serviceProvided = patch.serviceExternalId !== undefined || patch.serviceName !== undefined;
    let nextServiceId = existing.serviceId;
    if (serviceProvided) {
        const svc = await matchService(
            businessId,
            patch.serviceExternalId?.trim() || null,
            patch.serviceName?.trim() || '',
        );
        nextServiceId = svc?.id ?? null;
    }

    const timeOrEmployeeChanged =
        patch.startsAt !== undefined ||
        patch.durationMinutes !== undefined ||
        (masterProvided && nextEmployee !== existing.employeeUserId);
    if (existing.status === 'scheduled' && timeOrEmployeeChanged) {
        const slot = await validateSlot({
            businessId,
            employeeUserId: nextEmployee,
            startsAt: nextStartsAt,
            durationMinutes: nextDuration,
            excludeAppointmentId: appointmentId,
        });
        if (!slot.ok) return errorFor(slot.code);
    }

    const endsAt = new Date(nextStartsAt.getTime() + nextDuration * 60_000);
    const [updated] = await db
        .update(appointments)
        .set({
            startsAt: nextStartsAt,
            endsAt,
            employeeUserId: nextEmployee,
            serviceId: nextServiceId,
            notes: patch.notes !== undefined ? patch.notes?.trim() || null : existing.notes,
        })
        .where(eq(appointments.id, appointmentId))
        .returning();
    return { ok: true, detail: await toDetail(updated) };
}

export interface ListExternalBookingsFilter {
    telegramId?: string | null;
    phone?: string | null;
    status?: AppointmentStatus;
    from?: Date;
}

/** Записи бизнеса с фильтром по клиенту (telegram‖phone), статусу, дате от. */
export async function listExternalBookings(
    businessId: string,
    filter: ListExternalBookingsFilter = {},
): Promise<ExternalBookingDetail[]> {
    if (filter.telegramId || filter.phone) {
        const orParts = [];
        if (filter.telegramId) orParts.push(eq(clients.telegramId, filter.telegramId));
        if (filter.phone) orParts.push(eq(clients.phone, filter.phone));
        const matched = await db
            .select({ id: clients.id })
            .from(clients)
            .where(and(eq(clients.businessId, businessId), orParts.length === 1 ? orParts[0] : or(...orParts)));
        const clientIds = matched.map((r) => r.id);
        if (clientIds.length === 0) return [];

        const conds = [eq(appointments.businessId, businessId), inArray(appointments.clientId, clientIds)];
        if (filter.status) conds.push(eq(appointments.status, filter.status));
        if (filter.from) conds.push(gte(appointments.startsAt, filter.from));
        const rows = await db
            .select()
            .from(appointments)
            .where(and(...conds))
            .orderBy(asc(appointments.startsAt));
        return Promise.all(rows.map(toDetail));
    }

    const conds = [eq(appointments.businessId, businessId)];
    if (filter.status) conds.push(eq(appointments.status, filter.status));
    if (filter.from) conds.push(gte(appointments.startsAt, filter.from));
    const rows = await db
        .select()
        .from(appointments)
        .where(and(...conds))
        .orderBy(asc(appointments.startsAt));
    return Promise.all(rows.map(toDetail));
}
