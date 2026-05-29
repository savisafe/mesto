'use server';

import { revalidatePath } from 'next/cache';
import {
    listMembers,
    inviteMember,
    revokeInvite,
    removeMember,
    type InviteMemberInput,
    type ListMembersResult,
} from '@/services/employees';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listMembersAction(
    businessId: string,
): Promise<ActionResult<ListMembersResult>> {
    const r = await listMembers(businessId);
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function inviteMemberAction(
    input: InviteMemberInput,
): Promise<ActionResult<{ id: string; email: string }>> {
    const r = await inviteMember(input);
    if (r.ok) revalidatePath('/employees');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function revokeInviteAction(
    id: string,
): Promise<ActionResult<{ id: string }>> {
    const r = await revokeInvite(id);
    if (r.ok) revalidatePath('/employees');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function removeMemberAction(
    businessId: string,
    userId: string,
): Promise<ActionResult<{ userId: string }>> {
    const r = await removeMember(businessId, userId);
    if (r.ok) revalidatePath('/employees');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}
