'use server';

import { revalidatePath } from 'next/cache';
import {
    listClients,
    createClient,
    updateClient,
    type ListClientsInput,
    type ListClientsResult,
    type CreateClientInput,
    type UpdateClientInput,
} from '@/services/clients';
import {
    getClientsByEmployee,
    type EmployeeClientsGroup,
} from '@/services/team-clients';
import type { Client } from '@/db/schema';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getClientsByEmployeeAction(
    businessId: string,
): Promise<ActionResult<EmployeeClientsGroup[]>> {
    const result = await getClientsByEmployee(businessId);
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function listClientsAction(
    input: ListClientsInput,
): Promise<ActionResult<ListClientsResult>> {
    const result = await listClients(input);
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function createClientAction(
    input: CreateClientInput,
): Promise<ActionResult<Client>> {
    const result = await createClient(input);
    if (result.ok) revalidatePath('/clients');
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function updateClientAction(
    id: string,
    input: UpdateClientInput,
): Promise<ActionResult<Client>> {
    const result = await updateClient(id, input);
    if (result.ok) revalidatePath('/clients');
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}
