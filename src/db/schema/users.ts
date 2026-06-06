import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const userRoles = ['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'] as const;
export type UserRole = (typeof userRoles)[number];

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    role: text('role').$type<UserRole>().notNull().default('OWNER'),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    // chat_id пользователя в Telegram-боте (привязывается при подтверждении
    // аккаунта через deep-link). Нужен, чтобы писать пользователю в Telegram.
    telegramChatId: text('telegram_chat_id'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PublicUser = Omit<User, 'passwordHash'>;

// Явно перечисляем публичные поля, чтобы случайно не утёк passwordHash
// (или будущие чувствительные колонки) через `...rest`.
export function toPublicUser(user: User): PublicUser {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        telegramChatId: user.telegramChatId,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
