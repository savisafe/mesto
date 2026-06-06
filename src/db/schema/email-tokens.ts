import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

// 'telegram_verify' — токен из deep-link Telegram-бота (kind хранится как text,
// отдельная миграция для нового значения не нужна).
export const emailTokenKinds = ['verify', 'magic_link', 'telegram_verify'] as const;
export type EmailTokenKind = (typeof emailTokenKinds)[number];

export const emailTokens = pgTable('email_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    kind: text('kind').$type<EmailTokenKind>().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EmailToken = typeof emailTokens.$inferSelect;
export type NewEmailToken = typeof emailTokens.$inferInsert;
