'use server';

import { revalidatePath } from 'next/cache';
import {
    listApiKeys,
    createApiKey,
    revokeApiKey,
    type ApiKeyItem,
    type CreateApiKeyInput,
} from '@/services/api-keys';
import type { ApiKeyScope } from '@/db/schema';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listApiKeysAction(businessId: string): Promise<ActionResult<ApiKeyItem[]>> {
    const r = await listApiKeys(businessId);
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function createApiKeyAction(
    input: CreateApiKeyInput,
): Promise<ActionResult<{ id: string; name: string; rawKey: string; scopes: ApiKeyScope[] }>> {
    const r = await createApiKey(input);
    if (r.ok) revalidatePath('/settings/api');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function revokeApiKeyAction(id: string): Promise<ActionResult<{ id: string }>> {
    const r = await revokeApiKey(id);
    if (r.ok) revalidatePath('/settings/api');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}
