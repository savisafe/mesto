import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { businesses } from './businesses';
import type { BusinessMemberRole } from './business-members';

export const invites = pgTable(
    'invites',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        email: text('email').notNull(),
        role: text('role').$type<BusinessMemberRole>().notNull(),
        tokenHash: text('token_hash').notNull().unique(),
        invitedByUserId: uuid('invited_by_user_id')
            .notNull()
            .references(() => users.id),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        acceptedAt: timestamp('accepted_at', { withTimezone: true }),
        revokedAt: timestamp('revoked_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        index('invites_business_id_idx').on(t.businessId),
        index('invites_email_idx').on(t.email),
    ],
);

export type Invite = typeof invites.$inferSelect;
export type NewInvite = typeof invites.$inferInsert;
