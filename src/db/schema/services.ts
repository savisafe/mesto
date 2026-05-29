import { pgTable, uuid, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';

export const services = pgTable(
    'services',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        // в минимальных единицах валюты (5000 = 5000 ₸ если KZT)
        amount: integer('amount').notNull().default(0),
        currency: text('currency').notNull().default('KZT'),
        durationMinutes: integer('duration_minutes').notNull(),
        isActive: boolean('is_active').notNull().default(true),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [index('services_business_id_idx').on(t.businessId)],
);

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
