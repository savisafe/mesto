import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { businesses } from './businesses';

export const apiKeyScopes = [
    'availability:read',
    'bookings:read',
    'bookings:write',
    'clients:write',
] as const;
export type ApiKeyScope = (typeof apiKeyScopes)[number];

/**
 * Per-business API-ключ для внешних систем (ai-bot). Сам ключ
 * (`mst_live_<hex>`) показывается владельцу один раз; в БД — только
 * `sha256` (как для сессий).
 */
export const apiKeys = pgTable(
    'api_keys',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        businessId: uuid('business_id')
            .notNull()
            .references(() => businesses.id, { onDelete: 'cascade' }),
        name: text('name').notNull(),
        keyHash: text('key_hash').notNull().unique(),
        scopes: text('scopes').array().$type<ApiKeyScope[]>().notNull(),
        lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
        revokedAt: timestamp('revoked_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [index('api_keys_business_id_idx').on(t.businessId)],
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
