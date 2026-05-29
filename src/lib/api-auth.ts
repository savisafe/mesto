import 'server-only';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { apiKeys, type ApiKeyScope } from '@/db/schema';
import { sha256 } from './crypto';

export type { ApiKeyScope };

const KEY_PREFIX = 'mst_live_';

export interface ApiAuthContext {
    businessId: string;
    keyId: string;
    scopes: ApiKeyScope[];
}

export type ApiAuthError = {
    ok: false;
    status: number;
    code: 'UNAUTHORIZED' | 'KEY_REVOKED';
    error: string;
};

export type ApiAuthResult = { ok: true; ctx: ApiAuthContext } | ApiAuthError;

const UNAUTHORIZED: ApiAuthError = {
    ok: false,
    status: 401,
    code: 'UNAUTHORIZED',
    error: 'Невалидный или отсутствующий ключ',
};

/** Генерирует новый ключ: `raw` отдаём владельцу один раз, `hash` храним в БД. */
export function generateApiKey(): { raw: string; hash: string } {
    const raw = KEY_PREFIX + randomBytes(32).toString('hex');
    return { raw, hash: sha256(raw) };
}

export function parseBearer(authorization: string | null | undefined): string | null {
    if (!authorization) return null;
    const m = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    return m ? m[1].trim() : null;
}

/**
 * Проверяет `Authorization: Bearer mst_live_...` и резолвит бизнес.
 * Обновляет `last_used_at`. Скоупы возвращаются в контексте (проверяй `hasScope`).
 */
export async function authenticateBearer(
    authorization: string | null | undefined,
): Promise<ApiAuthResult> {
    const token = parseBearer(authorization);
    if (!token || !token.startsWith(KEY_PREFIX)) return UNAUTHORIZED;

    const keyHash = sha256(token);
    const [row] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);
    if (!row) return UNAUTHORIZED;
    if (row.revokedAt) {
        return { ok: false, status: 403, code: 'KEY_REVOKED', error: 'Ключ отозван' };
    }

    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id));

    return {
        ok: true,
        ctx: { businessId: row.businessId, keyId: row.id, scopes: row.scopes },
    };
}

export function hasScope(ctx: ApiAuthContext, scope: ApiKeyScope): boolean {
    return ctx.scopes.includes(scope);
}
