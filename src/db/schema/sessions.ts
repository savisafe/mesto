import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const sessions = pgTable(
    'sessions',
    {
        id: text('id').primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        userAgent: text('user_agent'),
        ip: text('ip'),
    },
    (t) => [
        index('sessions_user_id_idx').on(t.userId),
        index('sessions_expires_at_idx').on(t.expiresAt),
    ],
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
