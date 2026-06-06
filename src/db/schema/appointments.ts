import { pgTable, uuid, text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';
import { clients } from './clients';
import { services } from './services';
import { users } from './users';

export const appointmentStatuses = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;
export type AppointmentStatus = (typeof appointmentStatuses)[number];

// 'public' — запись с публичной страницы онлайн-записи `/b/<slug>`.
export const appointmentSources = ['manual', 'external', 'public'] as const;
export type AppointmentSource = (typeof appointmentSources)[number];

export const appointments = pgTable(
    'appointments',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        clientId: uuid('client_id')
            .notNull()
            .references(() => clients.id, { onDelete: 'restrict' }),
        // service может быть удалён — запись остаётся с захардкоженной ценой
        serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
        // сотрудник опционален: пустой = «любой свободный»
        employeeUserId: uuid('employee_user_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
        endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
        status: text('status').$type<AppointmentStatus>().notNull().default('scheduled'),
        // amount и currency дублируются с services чтобы сохранить цену
        // на момент записи (услуга может подорожать, исторические записи это видят)
        amount: integer('amount').notNull().default(0),
        currency: text('currency').notNull().default('KZT'),
        notes: text('notes'),
        source: text('source').$type<AppointmentSource>().notNull().default('manual'),
        // для будущей идемпотентности входящих записей из ai-bot
        externalIdempotencyKey: text('external_idempotency_key'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [
        index('appointments_business_starts_idx').on(t.businessId, t.startsAt),
        index('appointments_employee_starts_idx').on(t.employeeUserId, t.startsAt),
        index('appointments_client_idx').on(t.clientId),
        // Идемпотентность входящих записей из бота: (бизнес, ключ) уникальны;
        // NULL-ключи (ручные записи) не конфликтуют.
        uniqueIndex('appointments_business_idempotency_idx').on(
            t.businessId,
            t.externalIdempotencyKey,
        ),
    ],
);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
