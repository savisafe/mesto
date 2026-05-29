import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, apiOk, apiError } from '@/lib/external-api';
import { findOrCreateClient } from '@/services/external/clients';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const auth = await requireAuth(req, 'clients:write');
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => null);
    if (!body || typeof body.name !== 'string' || typeof body.phone !== 'string') {
        return apiError(req, 400, 'INVALID_PAYLOAD', 'name и phone обязательны');
    }

    const { client, created } = await findOrCreateClient({
        businessId: auth.ctx.businessId,
        name: body.name,
        phone: body.phone,
        telegramId: body.telegram_id != null ? String(body.telegram_id) : null,
        note: typeof body.note === 'string' ? body.note : null,
    });
    return apiOk(req, { client_id: client.id, client_created: created }, 201);
}
