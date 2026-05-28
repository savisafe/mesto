import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const userRoles = ['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'] as const;
export type UserRole = (typeof userRoles)[number];

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    role: text('role').$type<UserRole>().notNull().default('OWNER'),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
