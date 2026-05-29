import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, apiOk } from '@/lib/external-api';
import { listExternalServices } from '@/services/external/catalog';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const services = await listExternalServices(auth.ctx.businessId);
    return apiOk(req, {
        services: services.map((s) => ({
            id: s.id,
            external_id: s.externalId,
            name: s.name,
            amount: s.amount,
            currency: s.currency,
            duration_minutes: s.durationMinutes,
            active: s.active,
        })),
    });
}
