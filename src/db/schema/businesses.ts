import { pgTable, uuid, text, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';

export const businesses = pgTable(
    'businesses',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        name: text('name').notNull(),
        description: text('description'),
        // Контакты для публичной страницы (необязательные).
        address: text('address'),
        phone: text('phone'),
        isActive: boolean('is_active').notNull().default(true),
        // Публичный slug для страницы онлайн-записи `/b/<slug>`. null = страница
        // ещё не настроена. Уникален среди всех бизнесов.
        slug: text('slug'),
        // Включена ли публичная страница онлайн-записи владельцем.
        publicBookingEnabled: boolean('public_booking_enabled').notNull().default(false),
        // Оформление публичной страницы: тема ('light' | 'dark') и акцентный цвет (#rrggbb).
        publicTheme: text('public_theme').notNull().default('light'),
        publicAccentColor: text('public_accent_color').notNull().default('#7c3aed'),
        // URL встраивания Instagram-виджета (SnapWidget/LightWidget). null = не задан.
        // Хранится только провайдерский iframe-src с разрешённого хоста (см. lib/instagram-widget).
        instagramWidgetUrl: text('instagram_widget_url'),
        // IANA-зона бизнеса. Все «локальные» часы графика и слоты резолвятся в ней.
        timezone: text('timezone').notNull().default('Asia/Almaty'),
        ownerId: uuid('owner_id')
            .notNull()
            .references(() => users.id),
        // null = активен. Заполняется при «архивировании» — бизнес скрывается
        // из основных списков, но строки остаются в БД 30 дней (см.
        // services/businesses.ts purgeExpiredArchives + Vercel cron).
        archivedAt: timestamp('archived_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => [
        index('businesses_owner_id_idx').on(t.ownerId),
        index('businesses_archived_at_idx').on(t.archivedAt),
        // Уникальность slug; несколько NULL не конфликтуют (бизнес без страницы).
        uniqueIndex('businesses_slug_idx').on(t.slug),
    ],
);

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
