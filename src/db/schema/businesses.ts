import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const businesses = pgTable(
    'businesses',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        name: text('name').notNull(),
        description: text('description'),
        isActive: boolean('is_active').notNull().default(true),
        ownerId: uuid('owner_id')
            .notNull()
            .references(() => users.id),
        // null = активен. Заполняется при «архивировании» — бизнес скрывается
        // из основных списков, но строки остаются в БД 30 дней (см.
        // services/businesses.ts purgeExpiredArchives + Vercel cron).
        archivedAt: timestamp('archived_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [
        index('businesses_owner_id_idx').on(t.ownerId),
        index('businesses_archived_at_idx').on(t.archivedAt),
    ],
);

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
