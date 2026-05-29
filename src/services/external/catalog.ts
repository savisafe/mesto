import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { services } from '@/db/schema';

export interface ExternalServiceItem {
    id: string;
    externalId: string | null;
    name: string;
    amount: number;
    currency: string;
    durationMinutes: number;
    active: boolean;
}

export async function listExternalServices(businessId: string): Promise<ExternalServiceItem[]> {
    const rows = await db.select().from(services).where(eq(services.businessId, businessId));
    return rows.map((s) => ({
        id: s.id,
        externalId: s.externalId,
        name: s.name,
        amount: s.amount,
        currency: s.currency,
        durationMinutes: s.durationMinutes,
        active: s.isActive,
    }));
}
