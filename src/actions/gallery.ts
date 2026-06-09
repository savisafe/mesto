'use server';

import { revalidatePath } from 'next/cache';
import { listGalleryPhotos, removeGalleryPhoto, type GalleryItem } from '@/services/gallery';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listGalleryAction(businessId: string): Promise<ActionResult<GalleryItem[]>> {
    const r = await listGalleryPhotos(businessId);
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function removeGalleryPhotoAction(
    photoId: string,
): Promise<ActionResult<{ id: string }>> {
    const r = await removeGalleryPhoto(photoId);
    if (r.ok) revalidatePath('/settings');
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}
