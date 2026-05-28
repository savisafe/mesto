'use server';

import { revalidatePath } from 'next/cache';
import {
    listBusinesses,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    type CreateBusinessInput,
    type UpdateBusinessInput,
} from '@/services/businesses';
import type { Business } from '@/db/schema';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listBusinessesAction(): Promise<ActionResult<Business[]>> {
    const result = await listBusinesses();
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function createBusinessAction(
    input: CreateBusinessInput,
): Promise<ActionResult<Business>> {
    const result = await createBusiness(input);
    if (result.ok) {
        revalidatePath('/dashboard');
        revalidatePath('/my-business');
    }
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function updateBusinessAction(
    id: string,
    input: UpdateBusinessInput,
): Promise<ActionResult<Business>> {
    const result = await updateBusiness(id, input);
    if (result.ok) {
        revalidatePath('/dashboard');
        revalidatePath('/my-business');
    }
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function deleteBusinessAction(
    id: string,
): Promise<ActionResult<{ id: string }>> {
    const result = await deleteBusiness(id);
    if (result.ok) {
        revalidatePath('/dashboard');
        revalidatePath('/my-business');
    }
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}
