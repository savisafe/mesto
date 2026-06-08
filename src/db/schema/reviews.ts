import { pgTable, uuid, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';
import { appointments } from './appointments';
import { clients } from './clients';
import { users } from './users';

/**
 * Отзыв клиента о визите. Оставить можно только после завершённой записи
 * (один отзыв на запись — уникальность по appointment_id). Публикуется сразу,
 * владелец может скрыть (is_hidden). employee_user_id копируется из записи на
 * момент отзыва — для рейтинга по конкретному специалисту.
 */
export const reviews = pgTable(
    'reviews',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        appointmentId: uuid('appointment_id')
            .notNull()
            .references(() => appointments.id, { onDelete: 'cascade' }),
        employeeUserId: uuid('employee_user_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
        // Имя автора — снимок на момент отзыва (клиент может быть удалён/переименован).
        authorName: text('author_name').notNull(),
        // Оценка 1..5.
        rating: integer('rating').notNull(),
        comment: text('comment'),
        isHidden: boolean('is_hidden').notNull().default(false),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [
        index('reviews_business_idx').on(t.businessId),
        index('reviews_employee_idx').on(t.employeeUserId),
        // Один отзыв на запись.
        uniqueIndex('reviews_appointment_idx').on(t.appointmentId),
    ],
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
