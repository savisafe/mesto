import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { apiKeys, businesses, apiKeyScopes, type ApiKeyScope } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { generateApiKey } from '@/lib/api-auth';

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const FORBIDDEN = { ok: false as const, error: 'Нет доступа', code: 'FORBIDDEN' as const };
const NOT_FOUND = { ok: false as const, error: 'Не найдено', code: 'NOT_FOUND' as const };

// Управление ключами — только владелец бизнеса.
async function ownerGuard(
    businessId: string,
): Promise<{ ok: true } | typeof UNAUTHORIZED | typeof FORBIDDEN | typeof NOT_FOUND> {
    const me = await getCurrentUser();
    if (!me) return UNAUTHORIZED;
    const [biz] = await db
        .select({ ownerId: businesses.ownerId })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
    if (!biz) return NOT_FOUND;
    if (biz.ownerId !== me.id) return FORBIDDEN;
    return { ok: true };
}

export interface ApiKeyItem {
    id: string;
    name: string;
    scopes: ApiKeyScope[];
    lastUsedAt: Date | null;
    createdAt: Date;
}

export async function listApiKeys(businessId: string): Promise<ServiceResult<ApiKeyItem[]>> {
    const guard = await ownerGuard(businessId);
    if (!guard.ok) return guard;
    const rows = await db
        .select({
            id: apiKeys.id,
            name: apiKeys.name,
            scopes: apiKeys.scopes,
            lastUsedAt: apiKeys.lastUsedAt,
            createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .where(and(eq(apiKeys.businessId, businessId), isNull(apiKeys.revokedAt)))
        .orderBy(desc(apiKeys.createdAt));
    return { ok: true, data: rows };
}

export interface CreateApiKeyInput {
    businessId: string;
    name: string;
    scopes?: ApiKeyScope[];
}

export async function createApiKey(
    input: CreateApiKeyInput,
): Promise<ServiceResult<{ id: string; name: string; rawKey: string; scopes: ApiKeyScope[] }>> {
    const guard = await ownerGuard(input.businessId);
    if (!guard.ok) return guard;

    const name = input.name?.trim() || 'bot';
    const scopes =
        input.scopes && input.scopes.length > 0 ? input.scopes : ([...apiKeyScopes] as ApiKeyScope[]);
    const { raw, hash } = generateApiKey();

    const [row] = await db
        .insert(apiKeys)
        .values({ businessId: input.businessId, name, keyHash: hash, scopes })
        .returning();

    // rawKey возвращается ОДИН раз — в БД только hash.
    return { ok: true, data: { id: row.id, name: row.name, rawKey: raw, scopes: row.scopes } };
}

export async function revokeApiKey(id: string): Promise<ServiceResult<{ id: string }>> {
    const me = await getCurrentUser();
    if (!me) return UNAUTHORIZED;
    const [key] = await db
        .select({ businessId: apiKeys.businessId, revokedAt: apiKeys.revokedAt })
        .from(apiKeys)
        .where(eq(apiKeys.id, id))
        .limit(1);
    if (!key) return NOT_FOUND;
    const guard = await ownerGuard(key.businessId);
    if (!guard.ok) return guard;
    if (key.revokedAt) return { ok: true, data: { id } };
    await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id));
    return { ok: true, data: { id } };
}
