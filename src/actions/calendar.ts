'use server';

import { getCalendarDay, type CalendarDayData } from '@/services/calendar';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getCalendarDayAction(
    businessId: string,
    date: string,
): Promise<ActionResult<CalendarDayData>> {
    const r = await getCalendarDay(businessId, date);
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}
