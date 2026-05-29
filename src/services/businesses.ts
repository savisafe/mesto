import 'server-only';
import { and, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/db';
import {
    businesses,
    businessMembers,
    type Business,
    type NewBusiness,
} from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

export interface CreateBusinessInput {
    name: string;
    description?: string;
    isActive?: boolean;
}

export interface UpdateBusinessInput {
    name?: string;
    description?: string;
    isActive?: boolean;
}

const FORBIDDEN = { ok: false as const, error: 'Нет доступа', code: 'FORBIDDEN' as const };
const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const NOT_FOUND = { ok: false as const, error: 'Бизнес не найден', code: 'NOT_FOUND' as const };

export async function listBusinesses(): Promise<ServiceResult<Business[]>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const memberships = await db
        .select({ businessId: businessMembers.businessId })
        .from(businessMembers)
        .where(eq(businessMembers.userId, user.id));
    const memberBizIds = memberships.map((m) => m.businessId);

    const where =
        memberBizIds.length > 0
            ? or(eq(businesses.ownerId, user.id), inArray(businesses.id, memberBizIds))
            : eq(businesses.ownerId, user.id);

    const rows = await db.select().from(businesses).where(where);
    return { ok: true, data: rows };
}

export async function getBusiness(id: string): Promise<ServiceResult<Business>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const [biz] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
    if (!biz) return NOT_FOUND;

    if (biz.ownerId !== user.id) {
        const [member] = await db
            .select({ userId: businessMembers.userId })
            .from(businessMembers)
            .where(
                and(
                    eq(businessMembers.businessId, id),
                    eq(businessMembers.userId, user.id),
                ),
            )
            .limit(1);
        if (!member) return FORBIDDEN;
    }

    return { ok: true, data: biz };
}

export async function createBusiness(
    input: CreateBusinessInput,
): Promise<ServiceResult<Business>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
        return { ok: false, error: 'Только владелец может создавать бизнес', code: 'FORBIDDEN' };
    }

    const name = input.name?.trim();
    if (!name) {
        return { ok: false, error: 'Название обязательно', code: 'INVALID_NAME' };
    }

    const [biz] = await db
        .insert(businesses)
        .values({
            name,
            description: input.description?.trim() || null,
            isActive: input.isActive ?? true,
            ownerId: user.id,
        })
        .returning();

    return { ok: true, data: biz };
}

export async function updateBusiness(
    id: string,
    input: UpdateBusinessInput,
): Promise<ServiceResult<Business>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const [existing] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
    if (!existing) return NOT_FOUND;
    if (existing.ownerId !== user.id) return FORBIDDEN;

    const updates: Partial<NewBusiness> = {};
    if (input.name !== undefined) {
        const trimmed = input.name.trim();
        if (!trimmed) {
            return { ok: false, error: 'Название не может быть пустым', code: 'INVALID_NAME' };
        }
        updates.name = trimmed;
    }
    if (input.description !== undefined) {
        updates.description = input.description.trim() || null;
    }
    if (input.isActive !== undefined) {
        updates.isActive = input.isActive;
    }

    const [biz] = await db
        .update(businesses)
        .set(updates)
        .where(eq(businesses.id, id))
        .returning();
    return { ok: true, data: biz };
}

export async function deleteBusiness(id: string): Promise<ServiceResult<{ id: string }>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const [existing] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
    if (!existing) return NOT_FOUND;
    if (existing.ownerId !== user.id) return FORBIDDEN;

    await db.delete(businesses).where(eq(businesses.id, id));
    return { ok: true, data: { id } };
}
