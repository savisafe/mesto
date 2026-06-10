'use server';

import { revalidatePath } from 'next/cache';
import {
    listAppointments,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    completeAppointment,
    noShowAppointment,
    listPendingConfirmations,
    type ListAppointmentsInput,
    type CreateAppointmentInput,
    type UpdateAppointmentInput,
    type AppointmentDetail,
} from '@/services/appointments';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

// Мутации статуса записи влияют и на календарь, и на финансовую аналитику.
function revalidateAppointmentViews(): void {
    revalidatePath('/calendar');
    revalidatePath('/finance');
}

export async function listAppointmentsAction(
    input: ListAppointmentsInput,
): Promise<ActionResult<AppointmentDetail[]>> {
    const r = await listAppointments(input);
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function listPendingConfirmationsAction(
    businessId: string,
): Promise<ActionResult<AppointmentDetail[]>> {
    const r = await listPendingConfirmations(businessId);
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function createAppointmentAction(
    input: CreateAppointmentInput,
): Promise<ActionResult<AppointmentDetail>> {
    const r = await createAppointment(input);
    if (r.ok) revalidateAppointmentViews();
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function updateAppointmentAction(
    id: string,
    input: UpdateAppointmentInput,
): Promise<ActionResult<AppointmentDetail>> {
    const r = await updateAppointment(id, input);
    if (r.ok) revalidateAppointmentViews();
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function cancelAppointmentAction(id: string): Promise<ActionResult<{ id: string }>> {
    const r = await cancelAppointment(id);
    if (r.ok) revalidateAppointmentViews();
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function completeAppointmentAction(id: string): Promise<ActionResult<{ id: string }>> {
    const r = await completeAppointment(id);
    if (r.ok) revalidateAppointmentViews();
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function noShowAppointmentAction(id: string): Promise<ActionResult<{ id: string }>> {
    const r = await noShowAppointment(id);
    if (r.ok) revalidateAppointmentViews();
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}
