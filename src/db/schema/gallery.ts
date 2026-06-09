import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';

/**
 * Фото галереи «Примеры работ» для публичной страницы. Файлы лежат в Vercel Blob,
 * в БД храним публичный URL. Удаление строки сопровождается удалением блоба.
 */
export const galleryPhotos = pgTable(
    'gallery_photos',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        url: text('url').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('gallery_photos_business_idx').on(t.businessId)],
);

export type GalleryPhoto = typeof galleryPhotos.$inferSelect;
export type NewGalleryPhoto = typeof galleryPhotos.$inferInsert;
