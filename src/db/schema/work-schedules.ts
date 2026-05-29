import { pgTable, uuid, integer, date, timestamp, index } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';
import { users } from './users';

/**
 * Рабочий график: окна работы по дням недели в локальной зоне бизнеса.
 *
 * - `weekday`: 0 = Воскресенье … 6 = Суббота (как `dayjs().day()`).
 * - `startMinute`/`endMinute`: минуты от локальной полуночи, `end > start`
 *   (овернайт-смены в V1 не поддерживаем).
 * - `employeeUserId = null` — график по умолчанию для всего бизнеса; строка с
 *   конкретным сотрудником переопределяет его часы.
 * - `validFrom`/`validUntil` (включительно, `null` = без границы) — чтобы менять
 *   график с какой-то даты, не теряя историю.
 */
export const workSchedules = pgTable(
    'work_schedules',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        employeeUserId: uuid('employee_user_id').references(() => users.id, {
            onDelete: 'cascade',
        }),
        weekday: integer('weekday').notNull(),
        startMinute: integer('start_minute').notNull(),
        endMinute: integer('end_minute').notNull(),
        validFrom: date('valid_from'),
        validUntil: date('valid_until'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [
        index('work_schedules_business_weekday_idx').on(t.businessId, t.weekday),
        index('work_schedules_employee_idx').on(t.employeeUserId),
    ],
);

export type WorkSchedule = typeof workSchedules.$inferSelect;
export type NewWorkSchedule = typeof workSchedules.$inferInsert;
