'use server';

import { revalidatePath } from 'next/cache';
import {
    listBusinesses,
    listArchivedBusinesses,
    listMyMemberships,
    createBusiness,
    updateBusiness,
    archiveBusiness,
    unarchiveBusiness,
    type CreateBusinessInput,
    type UpdateBusinessInput,
    type Membership,
} from '@/services/businesses';
import type { Business } from '@/db/schema';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listBusinessesAction(): Promise<ActionResult<Business[]>> {
    const result = await listBusinesses();
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function listMyMembershipsAction(): Promise<ActionResult<Membership[]>> {
    const result = await listMyMemberships();
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function listArchivedBusinessesAction(): Promise<ActionResult<Business[]>> {
    const result = await listArchivedBusinesses();
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

export async function archiveBusinessAction(
    id: string,
): Promise<ActionResult<Business>> {
    const result = await archiveBusiness(id);
    if (result.ok) {
        revalidatePath('/dashboard');
        revalidatePath('/my-business');
    }
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function unarchiveBusinessAction(
    id: string,
): Promise<ActionResult<Business>> {
    const result = await unarchiveBusiness(id);
    if (result.ok) {
        revalidatePath('/dashboard');
        revalidatePath('/my-business');
    }
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}
