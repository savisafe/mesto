import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { del } from '@vercel/blob';
import { db } from '@/db';
import { galleryPhotos } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { checkBusinessAccess } from './_access';

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const FORBIDDEN = { ok: false as const, error: 'Нет доступа', code: 'FORBIDDEN' as const };
const NOT_FOUND = { ok: false as const, error: 'Фото не найдено', code: 'NOT_FOUND' as const };

export const MAX_GALLERY_PHOTOS = 30;

export interface GalleryItem {
    id: string;
    url: string;
}

/** Публичная галерея бизнеса (без авторизации) — для страницы `/b/<slug>`. */
export async function getPublicGalleryPhotos(businessId: string): Promise<GalleryItem[]> {
    const rows = await db
        .select({ id: galleryPhotos.id, url: galleryPhotos.url })
        .from(galleryPhotos)
        .where(eq(galleryPhotos.businessId, businessId))
        .orderBy(asc(galleryPhotos.createdAt));
    return rows;
}

/** Галерея для управления в кабинете (с проверкой доступа). */
export async function listGalleryPhotos(businessId: string): Promise<ServiceResult<GalleryItem[]>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;
    const access = await checkBusinessAccess(businessId, user.id);
    if (!access) return FORBIDDEN;
    return { ok: true, data: await getPublicGalleryPhotos(businessId) };
}

/** Добавляет фото (URL уже загруженного в Blob файла). */
export async function addGalleryPhoto(
    businessId: string,
    url: string,
): Promise<ServiceResult<GalleryItem>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;
    const access = await checkBusinessAccess(businessId, user.id);
    if (!access) return FORBIDDEN;

    const trimmed = url.trim();
    if (!trimmed) return { ok: false, error: 'Пустой URL', code: 'INVALID_PAYLOAD' };

    const existing = await db
        .select({ id: galleryPhotos.id })
        .from(galleryPhotos)
        .where(eq(galleryPhotos.businessId, businessId));
    if (existing.length >= MAX_GALLERY_PHOTOS) {
        return {
            ok: false,
            error: `Можно не больше ${MAX_GALLERY_PHOTOS} фото`,
            code: 'LIMIT_REACHED',
        };
    }

    const [created] = await db
        .insert(galleryPhotos)
        .values({ businessId, url: trimmed })
        .returning({ id: galleryPhotos.id, url: galleryPhotos.url });
    return { ok: true, data: created };
}

/** Удаляет фото из БД и из Blob-хранилища. */
export async function removeGalleryPhoto(photoId: string): Promise<ServiceResult<{ id: string }>> {
    const user = await getCurrentUser();
    if (!user) return UNAUTHORIZED;

    const [photo] = await db
        .select({ businessId: galleryPhotos.businessId, url: galleryPhotos.url })
        .from(galleryPhotos)
        .where(eq(galleryPhotos.id, photoId))
        .limit(1);
    if (!photo) return NOT_FOUND;
    const access = await checkBusinessAccess(photo.businessId, user.id);
    if (!access) return FORBIDDEN;

    // Блоб удаляем best-effort: даже если не вышло, строку из БД убираем.
    try {
        await del(photo.url);
    } catch {
        // игнорируем — осиротевший блоб не критичен
    }
    await db.delete(galleryPhotos).where(eq(galleryPhotos.id, photoId));
    return { ok: true, data: { id: photoId } };
}
