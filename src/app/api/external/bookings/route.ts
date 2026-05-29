import { NextRequest, NextResponse } from 'next/server';
import {
    requireAuth,
    apiOk,
    apiError,
    bookingErrorStatus,
    bookingDetailJson,
} from '@/lib/external-api';
import { createExternalBooking, listExternalBookings } from '@/services/external/bookings';
import type { AppointmentStatus } from '@/db/schema';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const auth = await requireAuth(req, 'bookings:write');
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => null);
    if (!body) return apiError(req, 400, 'INVALID_PAYLOAD', 'Пустое тело');

    const required: [unknown, string][] = [
        [body.idempotency_key, 'idempotency_key'],
        [body.service_name, 'service_name'],
        [body.starts_at, 'starts_at'],
        [body.duration_minutes, 'duration_minutes'],
        [body.client?.name, 'client.name'],
        [body.client?.phone, 'client.phone'],
    ];
    for (const [value, field] of required) {
        if (value == null || value === '') {
            return apiError(req, 400, 'INVALID_PAYLOAD', `${field} обязательно`, field);
        }
    }

    const r = await createExternalBooking({
        businessId: auth.ctx.businessId,
        idempotencyKey: String(body.idempotency_key),
        serviceExternalId: body.service_external_id ?? null,
        serviceName: String(body.service_name),
        startsAt: new Date(body.starts_at),
        durationMinutes: Number(body.duration_minutes),
        amount: body.amount ?? null,
        currency: body.currency ?? null,
        client: {
            name: String(body.client.name),
            phone: String(body.client.phone),
            telegramId: body.client.telegram_id != null ? String(body.client.telegram_id) : null,
        },
        masterId: body.master_id ?? null,
        masterName: body.master_name ?? null,
        notes: typeof body.notes === 'string' ? body.notes : null,
    });
    if (!r.ok) return apiError(req, bookingErrorStatus(r.code), r.code, r.error, r.field);

    return apiOk(
        req,
        {
            appointment_id: r.appointmentId,
            client_id: r.clientId,
            client_created: r.clientCreated,
            service_matched: r.serviceMatched,
            master_matched: r.masterMatched,
            idempotent_replay: r.idempotentReplay,
            starts_at: r.startsAt.toISOString(),
            ends_at: r.endsAt.toISOString(),
        },
        r.idempotentReplay ? 200 : 201,
    );
}

export async function GET(req: NextRequest) {
    const auth = await requireAuth(req, 'bookings:read');
    if (auth instanceof NextResponse) return auth;

    const sp = req.nextUrl.searchParams;
    const fromStr = sp.get('from');
    const statusStr = sp.get('status');
    const bookings = await listExternalBookings(auth.ctx.businessId, {
        telegramId: sp.get('telegram_id'),
        phone: sp.get('phone'),
        status: statusStr ? (statusStr as AppointmentStatus) : undefined,
        from: fromStr ? new Date(fromStr) : undefined,
    });
    return apiOk(req, { bookings: bookings.map(bookingDetailJson) });
}
