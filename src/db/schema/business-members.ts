import { pgTable, uuid, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users';
import { businesses } from './businesses';

export const businessMemberRoles = ['MANAGER', 'EMPLOYEE'] as const;
export type BusinessMemberRole = (typeof businessMemberRoles)[number];

export const businessMembers = pgTable(
    'business_members',
    {
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        role: text('role').$type<BusinessMemberRole>().notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.businessId, t.userId] })],
);

export type BusinessMember = typeof businessMembers.$inferSelect;
export type NewBusinessMember = typeof businessMembers.$inferInsert;
