import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients, type Client } from '@/db/schema';

export interface FindOrCreateClientInput {
    businessId: string;
    name: string;
    phone: string;
    telegramId?: string | null;
    email?: string | null;
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
    const email = input.email?.trim() || null;
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
        // Дозаполняем telegramId / email best-effort, если их ещё не было.
        const patch: Partial<typeof clients.$inferInsert> = {};
        if (telegramId && !byPhone.telegramId) patch.telegramId = telegramId;
        if (email && !byPhone.email) patch.email = email;
        if (Object.keys(patch).length > 0) {
            const [updated] = await db
                .update(clients)
                .set(patch)
                .where(eq(clients.id, byPhone.id))
                .returning();
            return { client: updated ?? byPhone, created: false };
        }
        return { client: byPhone, created: false };
    }

    const [created] = await db
        .insert(clients)
        .values({ businessId, name, phone, telegramId, email, note: input.note?.trim() || null })
        .returning();
    return { client: created, created: true };
}
