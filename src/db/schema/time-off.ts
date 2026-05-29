import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';
import { users } from './users';

export const timeOffReasons = ['lunch', 'day_off', 'vacation', 'sick', 'holiday', 'other'] as const;
export type TimeOffReason = (typeof timeOffReasons)[number];

/**
 * Точечные блоки: обед, отгул, отпуск, болезнь, выходной/праздник студии.
 *
 * - `employeeUserId = null` — блок для всего бизнеса (студия закрыта целиком);
 *   иначе блок только у конкретного сотрудника.
 * - `[startsAt, endsAt)` хранятся в UTC (как и записи), сравнение интервалов
 *   идёт в абсолютном времени.
 */
export const timeOff = pgTable(
    'time_off',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        employeeUserId: uuid('employee_user_id').references(() => users.id, {
            onDelete: 'cascade',
        }),
        startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
        endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
        reason: text('reason').$type<TimeOffReason>().notNull().default('other'),
        note: text('note'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [
        index('time_off_business_starts_idx').on(t.businessId, t.startsAt),
        index('time_off_employee_idx').on(t.employeeUserId),
    ],
);

export type TimeOff = typeof timeOff.$inferSelect;
export type NewTimeOff = typeof timeOff.$inferInsert;
