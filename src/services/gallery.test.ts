import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@vercel/blob', () => ({ del: vi.fn().mockResolvedValue(undefined), put: vi.fn() }));

import { db } from '@/db';
import * as schema from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { del } from '@vercel/blob';
import {
    addGalleryPhoto,
    listGalleryPhotos,
    getPublicGalleryPhotos,
    removeGalleryPhoto,
    MAX_GALLERY_PHOTOS,
} from './gallery';

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockDel = vi.mocked(del);

async function makeUser(email: string) {
    const [u] = await db
        .insert(schema.users)
        .values({ email, passwordHash: 'argon2$test', name: email, phone: '+70000000000' })
        .returning();
    return u;
}

async function makeBusiness(ownerId: string) {
    const [b] = await db.insert(schema.businesses).values({ name: 'Studio', ownerId }).returning();
    return b;
}

const asUser = (id: string) => ({ id }) as unknown as schema.PublicUser;

beforeEach(async () => {
    await db.delete(schema.galleryPhotos);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue(null);
    mockDel.mockClear();
});

describe('addGalleryPhoto', () => {
    it('владелец добавляет фото', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(asUser(owner.id));

        const r = await addGalleryPhoto(biz.id, 'https://x.public.blob.vercel-storage.com/a.jpg');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.url).toContain('a.jpg');
    });

    it('FORBIDDEN для постороннего', async () => {
        const owner = await makeUser('o@test.local');
        const stranger = await makeUser('s@test.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(asUser(stranger.id));

        const r = await addGalleryPhoto(biz.id, 'https://x.blob/a.jpg');
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('FORBIDDEN');
    });

    it('лимит на количество фото', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        await db.insert(schema.galleryPhotos).values(
            Array.from({ length: MAX_GALLERY_PHOTOS }, (_, i) => ({
                businessId: biz.id,
                url: `https://x.blob/${i}.jpg`,
            })),
        );
        mockGetCurrentUser.mockResolvedValue(asUser(owner.id));

        const r = await addGalleryPhoto(biz.id, 'https://x.blob/extra.jpg');
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('LIMIT_REACHED');
    });
});

describe('getPublicGalleryPhotos / listGalleryPhotos', () => {
    it('публичный список без авторизации', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        await db.insert(schema.galleryPhotos).values({ businessId: biz.id, url: 'https://x.blob/a.jpg' });

        const list = await getPublicGalleryPhotos(biz.id);
        expect(list).toHaveLength(1);
    });

    it('listGalleryPhotos требует доступ', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        mockGetCurrentUser.mockResolvedValue(null);

        const r = await listGalleryPhotos(biz.id);
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('UNAUTHORIZED');
    });
});

describe('removeGalleryPhoto', () => {
    it('владелец удаляет фото и блоб', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const [photo] = await db
            .insert(schema.galleryPhotos)
            .values({ businessId: biz.id, url: 'https://x.blob/a.jpg' })
            .returning();
        mockGetCurrentUser.mockResolvedValue(asUser(owner.id));

        const r = await removeGalleryPhoto(photo.id);
        expect(r.ok).toBe(true);
        expect(mockDel).toHaveBeenCalledWith('https://x.blob/a.jpg');
        expect(await getPublicGalleryPhotos(biz.id)).toHaveLength(0);
    });

    it('FORBIDDEN для постороннего — фото остаётся', async () => {
        const owner = await makeUser('o@test.local');
        const stranger = await makeUser('s@test.local');
        const biz = await makeBusiness(owner.id);
        const [photo] = await db
            .insert(schema.galleryPhotos)
            .values({ businessId: biz.id, url: 'https://x.blob/a.jpg' })
            .returning();
        mockGetCurrentUser.mockResolvedValue(asUser(stranger.id));

        const r = await removeGalleryPhoto(photo.id);
        expect(r.ok).toBe(false);
        expect(mockDel).not.toHaveBeenCalled();
        expect(await getPublicGalleryPhotos(biz.id)).toHaveLength(1);
    });
});
