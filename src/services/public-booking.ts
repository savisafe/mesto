import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { appointments, businesses, services } from '@/db/schema';
import {
    getAvailability,
    getBusinessTeam,
    validateSlot,
    type DayAvailability,
    type ValidateSlotCode,
} from './availability';
import { findOrCreateClient } from './external/clients';

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

export interface PublicService {
    id: string;
    name: string;
    amount: number;
    currency: string;
    durationMinutes: number;
}

export interface PublicBusiness {
    id: string;
    name: string;
    description: string | null;
    timezone: string;
    slug: string;
    /** Оформление страницы, заданное владельцем в настройках. */
    theme: 'light' | 'dark';
    accentColor: string;
    services: PublicService[];
    team: { id: string; name: string }[];
}

// Резолвит бизнес по slug ТОЛЬКО если публичная запись включена, бизнес активен
// и не в архиве. Иначе null → страница отдаёт 404 (не раскрываем существование).
async function resolvePublicBusiness(slug: string) {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return null;
    const [biz] = await db
        .select()
        .from(businesses)
        .where(
            and(
                eq(businesses.slug, normalized),
                eq(businesses.publicBookingEnabled, true),
                eq(businesses.isActive, true),
                isNull(businesses.archivedAt),
            ),
        )
        .limit(1);
    return biz ?? null;
}

export async function getPublicBusiness(slug: string): Promise<PublicBusiness | null> {
    const biz = await resolvePublicBusiness(slug);
    if (!biz || !biz.slug) return null;

    const svc = await db
        .select({
            id: services.id,
            name: services.name,
            amount: services.amount,
            currency: services.currency,
            durationMinutes: services.durationMinutes,
        })
        .from(services)
        .where(and(eq(services.businessId, biz.id), eq(services.isActive, true)));

    const team = await getBusinessTeam(biz.id);

    return {
        id: biz.id,
        name: biz.name,
        description: biz.description,
        timezone: biz.timezone,
        slug: biz.slug,
        theme: biz.publicTheme === 'dark' ? 'dark' : 'light',
        accentColor: biz.publicAccentColor,
        services: svc,
        team,
    };
}

const MAX_RANGE_DAYS = 31;

export interface PublicAvailabilityInput {
    slug: string;
    serviceId?: string | null;
    employeeUserId?: string | null;
    from: string;
    to: string;
}

export async function getPublicAvailability(
    input: PublicAvailabilityInput,
): Promise<ServiceResult<DayAvailability[]>> {
    const biz = await resolvePublicBusiness(input.slug);
    if (!biz) return { ok: false, error: 'Страница не найдена', code: 'NOT_FOUND' };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.from) || !/^\d{4}-\d{2}-\d{2}$/.test(input.to)) {
        return { ok: false, error: 'Некорректный диапазон дат', code: 'INVALID_PAYLOAD' };
    }
    // Клампим окно, чтобы публичный запрос не мог попросить слоты на годы вперёд.
    const fromDate = new Date(`${input.from}T00:00:00Z`);
    const maxTo = new Date(fromDate.getTime() + MAX_RANGE_DAYS * 86_400_000);
    const toDate = new Date(`${input.to}T00:00:00Z`);
    const to = toDate > maxTo ? maxTo.toISOString().slice(0, 10) : input.to;

    // serviceId/employeeUserId валидируем по принадлежности бизнесу.
    let serviceId: string | null = null;
    if (input.serviceId) {
        const [s] = await db
            .select({ id: services.id })
            .from(services)
            .where(and(eq(services.id, input.serviceId), eq(services.businessId, biz.id)))
            .limit(1);
        serviceId = s?.id ?? null;
    }
    let employeeUserId: string | null = null;
    if (input.employeeUserId) {
        const team = await getBusinessTeam(biz.id);
        employeeUserId = team.some((t) => t.id === input.employeeUserId)
            ? input.employeeUserId
            : null;
    }

    const data = await getAvailability({
        businessId: biz.id,
        from: input.from,
        to,
        serviceId,
        employeeUserId,
    });
    return { ok: true, data };
}

export type PublicBookingErrorCode =
    | 'NOT_FOUND'
    | 'INVALID_PAYLOAD'
    | 'SERVICE_NOT_FOUND'
    | 'INVALID_EMPLOYEE'
    | ValidateSlotCode;

export interface CreatePublicBookingInput {
    slug: string;
    serviceId: string;
    employeeUserId?: string | null;
    startsAt: Date;
    client: { name: string; phone: string; email?: string | null };
}

export interface PublicBookingCreated {
    appointmentId: string;
    startsAt: Date;
    endsAt: Date;
    serviceName: string;
}

function slotError(code: ValidateSlotCode): { error: string; code: ValidateSlotCode } {
    switch (code) {
        case 'OUT_OF_HOURS':
            return { code, error: 'Выбранное время вне рабочих часов' };
        case 'BLOCKED':
            return { code, error: 'Время недоступно (перерыв/выходной)' };
        case 'SLOT_CONFLICT':
            return { code, error: 'Этот слот только что заняли — выберите другое время' };
    }
}

export async function createPublicBooking(
    input: CreatePublicBookingInput,
): Promise<ServiceResult<PublicBookingCreated>> {
    const biz = await resolvePublicBusiness(input.slug);
    if (!biz) return { ok: false, error: 'Страница не найдена', code: 'NOT_FOUND' };

    const name = input.client.name?.trim() ?? '';
    const phone = input.client.phone?.trim() ?? '';
    if (!name) return { ok: false, error: 'Укажите имя', code: 'INVALID_PAYLOAD' };
    if (!/^\+?\d[\d\s()-]{4,}$/.test(phone)) {
        return { ok: false, error: 'Укажите корректный телефон', code: 'INVALID_PAYLOAD' };
    }
    if (!(input.startsAt instanceof Date) || isNaN(input.startsAt.getTime())) {
        return { ok: false, error: 'Некорректное время', code: 'INVALID_PAYLOAD' };
    }
    if (input.startsAt.getTime() <= Date.now()) {
        return { ok: false, error: 'Нельзя записаться в прошлое', code: 'INVALID_PAYLOAD' };
    }

    const [svc] = await db
        .select()
        .from(services)
        .where(
            and(
                eq(services.id, input.serviceId),
                eq(services.businessId, biz.id),
                eq(services.isActive, true),
            ),
        )
        .limit(1);
    if (!svc) return { ok: false, error: 'Услуга не найдена', code: 'SERVICE_NOT_FOUND' };

    let employeeUserId: string | null = null;
    if (input.employeeUserId) {
        const team = await getBusinessTeam(biz.id);
        if (!team.some((t) => t.id === input.employeeUserId)) {
            return { ok: false, error: 'Мастер не найден', code: 'INVALID_EMPLOYEE' };
        }
        employeeUserId = input.employeeUserId;
    }

    const slot = await validateSlot({
        businessId: biz.id,
        employeeUserId,
        startsAt: input.startsAt,
        durationMinutes: svc.durationMinutes,
    });
    if (!slot.ok) {
        const e = slotError(slot.code);
        return { ok: false, error: e.error, code: e.code };
    }

    const { client } = await findOrCreateClient({
        businessId: biz.id,
        name,
        phone,
        email: input.client.email ?? null,
    });

    const endsAt = new Date(input.startsAt.getTime() + svc.durationMinutes * 60_000);
    const [appt] = await db
        .insert(appointments)
        .values({
            businessId: biz.id,
            clientId: client.id,
            serviceId: svc.id,
            employeeUserId,
            startsAt: input.startsAt,
            endsAt,
            amount: svc.amount,
            currency: svc.currency,
            source: 'public',
        })
        .returning();

    return {
        ok: true,
        data: {
            appointmentId: appt.id,
            startsAt: appt.startsAt,
            endsAt: appt.endsAt,
            serviceName: svc.name,
        },
    };
}
