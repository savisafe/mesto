'use server';

import { revalidatePath } from 'next/cache';
import {
    getSchedule,
    setWeeklyHours,
    addTimeOff,
    removeTimeOff,
    type ScheduleData,
    type WeeklyDay,
    type TimeOffItem,
} from '@/services/schedule';
import type { TimeOffReason } from '@/db/schema';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getScheduleAction(businessId: string): Promise<ActionResult<ScheduleData>> {
    const r = await getSchedule(businessId);
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function setWeeklyHoursAction(
    businessId: string,
    days: WeeklyDay[],
): Promise<ActionResult<{ ok: true }>> {
    const r = await setWeeklyHours(businessId, days);
    if (r.ok) revalidatePath('/schedule');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function addTimeOffAction(input: {
    businessId: string;
    startsAt: string;
    endsAt: string;
    reason?: TimeOffReason;
    note?: string | null;
}): Promise<ActionResult<TimeOffItem>> {
    const r = await addTimeOff({
        businessId: input.businessId,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        reason: input.reason,
        note: input.note,
    });
    if (r.ok) revalidatePath('/schedule');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function removeTimeOffAction(
    businessId: string,
    id: string,
): Promise<ActionResult<{ id: string }>> {
    const r = await removeTimeOff(businessId, id);
    if (r.ok) revalidatePath('/schedule');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}
