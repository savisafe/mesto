import { NextRequest, NextResponse } from 'next/server';
import {
    requireAuth,
    apiOk,
    apiError,
    bookingErrorStatus,
    bookingDetailJson,
} from '@/lib/external-api';
import { getExternalBooking, updateExternalBooking } from '@/services/external/bookings';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req, 'bookings:read');
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const detail = await getExternalBooking(auth.ctx.businessId, id);
    if (!detail) return apiError(req, 404, 'NOT_FOUND', 'Запись не найдена');
    return apiOk(req, bookingDetailJson(detail));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req, 'bookings:write');
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const body = (await req.json().catch(() => null)) ?? {};

    const r = await updateExternalBooking(auth.ctx.businessId, id, {
        startsAt: body.starts_at ? new Date(body.starts_at) : undefined,
        durationMinutes: body.duration_minutes != null ? Number(body.duration_minutes) : undefined,
        serviceExternalId: body.service_external_id,
        serviceName: body.service_name,
        masterId: body.master_id,
        masterName: body.master_name,
        notes: body.notes,
    });
    if (!r.ok) return apiError(req, bookingErrorStatus(r.code), r.code, r.error, r.field);
    return apiOk(req, bookingDetailJson(r.detail));
}
