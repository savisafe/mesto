'use server';

import { revalidatePath } from 'next/cache';
import { listBusinessReviews, setReviewHidden, type OwnerReview } from '@/services/reviews';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listReviewsAction(businessId: string): Promise<ActionResult<OwnerReview[]>> {
    const r = await listBusinessReviews(businessId);
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function setReviewHiddenAction(
    reviewId: string,
    hidden: boolean,
): Promise<ActionResult<{ id: string; isHidden: boolean }>> {
    const r = await setReviewHidden(reviewId, hidden);
    if (r.ok) revalidatePath('/reviews');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}
