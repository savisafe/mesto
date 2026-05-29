import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';

export const clients = pgTable(
    'clients',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        phone: text('phone').notNull(),
        email: text('email'),
        note: text('note'),
        isBlacklisted: boolean('is_blacklisted').notNull().default(false),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [
        index('clients_business_id_idx').on(t.businessId),
        index('clients_name_idx').on(t.name),
        index('clients_phone_idx').on(t.phone),
    ],
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
