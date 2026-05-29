import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const businesses = pgTable(
    'businesses',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        name: text('name').notNull(),
        description: text('description'),
        isActive: boolean('is_active').notNull().default(true),
        // IANA-зона бизнеса. Все «локальные» часы графика и слоты резолвятся в ней.
        timezone: text('timezone').notNull().default('Asia/Almaty'),
        ownerId: uuid('owner_id')
            .notNull()
            .references(() => users.id),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [index('businesses_owner_id_idx').on(t.ownerId)],
);

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
