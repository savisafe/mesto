import 'server-only';
import { and, eq, or, ilike, inArray, notInArray, isNotNull, ne, sql, desc } from 'drizzle-orm';
import { db } from '@/db';
import {
    clients,
    businesses,
    businessMembers,
    appointments,
    type Client,
    type NewClient,
} from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

export interface ListClientsInput {
    businessId: string;
    search?: string;
    page?: number;
    perPage?: number;
    // Фильтр по сотруднику: id — клиенты с записями к этому сотруднику;
    // null — клиенты без закреплённого сотрудника (в т.ч. без записей и в ЧС);
    // undefined — без фильтра.
    employeeUserId?: string | null;
}

export interface ListClientsResult {
    clients: Client[];
    total: number;
    page: number;
    perPage: number;
}

export interface CreateClientInput {
    businessId: string;
    name: string;
    phone: string;
    email?: string;
    note?: string;
}

export interface UpdateClientInput {
    name?: string;
    phone?: string;
    email?: string;
    note?: string;
    isBlacklisted?: boolean;
}

const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 100;

const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const FORBIDDEN = { ok: false as const, error: 'Нет доступа к бизнесу', code: 'FORBIDDEN' as const };
const NOT_FOUND = { ok: false as const, error: 'Клиент не найден', code: 'NOT_FOUND' as const };

async function checkBusinessAccess(
    businessId: string,
    userId: string,
): Promise<boolean> {
    const [biz] = await db
        .select({ ownerId: businesses.ownerId })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
    if (!biz) return false;
    if (biz.ownerId === userId) return true;

    const [member] = await db
        .select({ userId: businessMembers.userId })
        .from(businessMembers)
        .where(
            and(
                eq(businessMembers.businessId, businessId),
                eq(businessMembers.userId, userId),
            ),
        )
        .limit(1);
    return !!member;
}

export async function listClients(
    input: ListClientsInput,
): Promise<ServiceResult<ListClientsResult>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const hasAccess = await checkBusinessAccess(input.businessId, user.id);
    if (!hasAccess) return FORBIDDEN;

    const page = Math.max(1, input.page ?? 1);
    const perPage = Math.min(MAX_PER_PAGE, Math.max(1, input.perPage ?? DEFAULT_PER_PAGE));
    const offset = (page - 1) * perPage;

    const search = input.search?.trim() ?? '';
    const conditions = [eq(clients.businessId, input.businessId)];

    if (search.length > 0) {
        conditions.push(
            or(ilike(clients.name, `%${search}%`), ilike(clients.phone, `%${search}%`))!,
        );
    }

    // Фильтр по сотруднику.
    if (input.employeeUserId === null) {
        // «Без сотрудника» = клиент не закреплён ни за одним сотрудником:
        // нет ни одной неотменённой записи с назначенным сотрудником. Сюда
        // попадают и клиенты без записей вовсе, и из ЧС (у них обычно нет записей).
        const clientsWithEmployee = db
            .selectDistinct({ id: appointments.clientId })
            .from(appointments)
            .where(
                and(
                    eq(appointments.businessId, input.businessId),
                    ne(appointments.status, 'cancelled'),
                    isNotNull(appointments.employeeUserId),
                ),
            );
        conditions.push(notInArray(clients.id, clientsWithEmployee));
    } else if (input.employeeUserId !== undefined) {
        // Конкретный сотрудник: клиенты с неотменёнными записями к нему.
        const clientIdsForEmployee = db
            .selectDistinct({ id: appointments.clientId })
            .from(appointments)
            .where(
                and(
                    eq(appointments.businessId, input.businessId),
                    ne(appointments.status, 'cancelled'),
                    eq(appointments.employeeUserId, input.employeeUserId),
                ),
            );
        conditions.push(inArray(clients.id, clientIdsForEmployee));
    }

    const where = and(...conditions);

    const [rows, [count]] = await Promise.all([
        db
            .select()
            .from(clients)
            .where(where)
            .orderBy(desc(clients.createdAt))
            .limit(perPage)
            .offset(offset),
        db.select({ count: sql<number>`count(*)::int` }).from(clients).where(where),
    ]);

    return {
        ok: true,
        data: { clients: rows, total: count.count, page, perPage },
    };
}

export async function createClient(
    input: CreateClientInput,
): Promise<ServiceResult<Client>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const hasAccess = await checkBusinessAccess(input.businessId, user.id);
    if (!hasAccess) return FORBIDDEN;

    const name = input.name?.trim();
    const phone = input.phone?.trim();
    if (!name) return { ok: false, error: 'Имя обязательно', code: 'INVALID_NAME' };
    if (!phone) return { ok: false, error: 'Телефон обязателен', code: 'INVALID_PHONE' };

    const [client] = await db
        .insert(clients)
        .values({
            businessId: input.businessId,
            name,
            phone,
            email: input.email?.trim() || null,
            note: input.note?.trim() || null,
        })
        .returning();

    return { ok: true, data: client };
}

export async function updateClient(
    id: string,
    input: UpdateClientInput,
): Promise<ServiceResult<Client>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const [existing] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (!existing) return NOT_FOUND;

    const hasAccess = await checkBusinessAccess(existing.businessId, user.id);
    if (!hasAccess) return FORBIDDEN;

    const updates: Partial<NewClient> = {};
    if (input.name !== undefined) {
        const trimmed = input.name.trim();
        if (!trimmed) return { ok: false, error: 'Имя не может быть пустым', code: 'INVALID_NAME' };
        updates.name = trimmed;
    }
    if (input.phone !== undefined) {
        const trimmed = input.phone.trim();
        if (!trimmed) return { ok: false, error: 'Телефон не может быть пустым', code: 'INVALID_PHONE' };
        updates.phone = trimmed;
    }
    if (input.email !== undefined) updates.email = input.email.trim() || null;
    if (input.note !== undefined) updates.note = input.note.trim() || null;
    if (input.isBlacklisted !== undefined) updates.isBlacklisted = input.isBlacklisted;

    const [client] = await db
        .update(clients)
        .set(updates)
        .where(eq(clients.id, id))
        .returning();
    return { ok: true, data: client };
}
