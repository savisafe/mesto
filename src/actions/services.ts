'use server';

import { revalidatePath } from 'next/cache';
import {
    listServices,
    createService,
    updateService,
    deleteService,
    type CreateServiceInput,
    type UpdateServiceInput,
} from '@/services/services';
import type { Service } from '@/db/schema';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listServicesAction(businessId: string): Promise<ActionResult<Service[]>> {
    const r = await listServices(businessId);
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function createServiceAction(input: CreateServiceInput): Promise<ActionResult<Service>> {
    const r = await createService(input);
    if (r.ok) revalidatePath('/calendar');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function updateServiceAction(
    id: string,
    input: UpdateServiceInput,
): Promise<ActionResult<Service>> {
    const r = await updateService(id, input);
    if (r.ok) revalidatePath('/calendar');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function deleteServiceAction(id: string): Promise<ActionResult<{ id: string }>> {
    const r = await deleteService(id);
    if (r.ok) revalidatePath('/calendar');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}
