import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients, type Client } from '@/db/schema';

export interface FindOrCreateClientInput {
    businessId: string;
    name: string;
    phone: string;
    telegramId?: string | null;
    note?: string | null;
}

export interface FindOrCreateClientResult {
    client: Client;
    created: boolean;
}

/**
 * Дедуп в рамках бизнеса: приоритет — `telegram_id`, затем `phone`. Если нашли
 * по телефону, а `telegram_id` ещё не записан — дозаполняем (best-effort).
 */
export async function findOrCreateClient(
    input: FindOrCreateClientInput,
): Promise<FindOrCreateClientResult> {
    const { businessId } = input;
    const telegramId = input.telegramId?.trim() || null;
    const phone = input.phone.trim();
    const name = input.name.trim();

    if (telegramId) {
        const [byTg] = await db
            .select()
            .from(clients)
            .where(and(eq(clients.businessId, businessId), eq(clients.telegramId, telegramId)))
            .limit(1);
        if (byTg) return { client: byTg, created: false };
    }

    const [byPhone] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.businessId, businessId), eq(clients.phone, phone)))
        .limit(1);
    if (byPhone) {
        if (telegramId && !byPhone.telegramId) {
            const [updated] = await db
                .update(clients)
                .set({ telegramId })
                .where(eq(clients.id, byPhone.id))
                .returning();
            return { client: updated ?? byPhone, created: false };
        }
        return { client: byPhone, created: false };
    }

    const [created] = await db
        .insert(clients)
        .values({ businessId, name, phone, telegramId, note: input.note?.trim() || null })
        .returning();
    return { client: created, created: true };
}
