'use server';

import {
    getFinanceAnalytics,
    type FinanceAnalyticsInput,
    type FinanceAnalytics,
} from '@/services/finance';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getFinanceAnalyticsAction(
    input: FinanceAnalyticsInput,
): Promise<ActionResult<FinanceAnalytics>> {
    const r = await getFinanceAnalytics(input);
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}
