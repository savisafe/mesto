import 'server-only';
import { and, eq, asc } from 'drizzle-orm';
import { db } from '@/db';
import { services, type Service, type NewService } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { checkBusinessAccess } from './_access';

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const FORBIDDEN = { ok: false as const, error: 'Нет доступа', code: 'FORBIDDEN' as const };
const NOT_FOUND = { ok: false as const, error: 'Услуга не найдена', code: 'NOT_FOUND' as const };

export interface CreateServiceInput {
    businessId: string;
    name: string;
    amount: number;
    currency?: string;
    durationMinutes: number;
}

export interface UpdateServiceInput {
    name?: string;
    amount?: number;
    currency?: string;
    durationMinutes?: number;
    isActive?: boolean;
}

export async function listServices(businessId: string): Promise<ServiceResult<Service[]>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;
    const access = await checkBusinessAccess(businessId, user.id);
    if (!access) return FORBIDDEN;

    const rows = await db
        .select()
        .from(services)
        .where(and(eq(services.businessId, businessId), eq(services.isActive, true)))
        .orderBy(asc(services.name));
    return { ok: true, data: rows };
}

export async function createService(input: CreateServiceInput): Promise<ServiceResult<Service>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;
    const access = await checkBusinessAccess(input.businessId, user.id);
    if (access !== 'OWNER') return FORBIDDEN;

    const name = input.name?.trim();
    if (!name) return { ok: false, error: 'Название обязательно', code: 'INVALID_NAME' };
    if (!Number.isInteger(input.amount) || input.amount < 0) {
        return { ok: false, error: 'Цена должна быть неотрицательным целым', code: 'INVALID_AMOUNT' };
    }
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0 || input.durationMinutes > 43200) {
        return { ok: false, error: 'Длительность от 1 минуты до 30 дней', code: 'INVALID_DURATION' };
    }

    const [created] = await db
        .insert(services)
        .values({
            businessId: input.businessId,
            name,
            amount: input.amount,
            currency: input.currency ?? 'KZT',
            durationMinutes: input.durationMinutes,
        })
        .returning();
    return { ok: true, data: created };
}

export async function updateService(
    id: string,
    input: UpdateServiceInput,
): Promise<ServiceResult<Service>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const [existing] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    if (!existing) return NOT_FOUND;
    const access = await checkBusinessAccess(existing.businessId, user.id);
    if (access !== 'OWNER') return FORBIDDEN;

    const updates: Partial<NewService> = {};
    if (input.name !== undefined) {
        const trimmed = input.name.trim();
        if (!trimmed) return { ok: false, error: 'Название не может быть пустым', code: 'INVALID_NAME' };
        updates.name = trimmed;
    }
    if (input.amount !== undefined) {
        if (!Number.isInteger(input.amount) || input.amount < 0) {
            return { ok: false, error: 'Некорректная цена', code: 'INVALID_AMOUNT' };
        }
        updates.amount = input.amount;
    }
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.durationMinutes !== undefined) {
        if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0 || input.durationMinutes > 43200) {
            return { ok: false, error: 'Длительность от 1 минуты до 30 дней', code: 'INVALID_DURATION' };
        }
        updates.durationMinutes = input.durationMinutes;
    }
    if (input.isActive !== undefined) updates.isActive = input.isActive;

    const [updated] = await db.update(services).set(updates).where(eq(services.id, id)).returning();
    return { ok: true, data: updated };
}

export async function deleteService(id: string): Promise<ServiceResult<{ id: string }>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const [existing] = await db
        .select({ businessId: services.businessId })
        .from(services)
        .where(eq(services.id, id))
        .limit(1);
    if (!existing) return NOT_FOUND;
    const access = await checkBusinessAccess(existing.businessId, user.id);
    if (access !== 'OWNER') return FORBIDDEN;

    // Мягкое удаление: ставим is_active=false, чтобы сохранить ссылки
    // у исторических appointments. Жёсткое удаление допустимо в админке.
    await db.update(services).set({ isActive: false }).where(eq(services.id, id));
    return { ok: true, data: { id } };
}
