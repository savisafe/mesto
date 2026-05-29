import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, apiOk, apiError, bookingErrorStatus } from '@/lib/external-api';
import { cancelExternalBooking } from '@/services/external/bookings';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req, 'bookings:write');
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const r = await cancelExternalBooking(auth.ctx.businessId, id);
    if (!r.ok) return apiError(req, bookingErrorStatus(r.code), r.code, r.error);
    return apiOk(req, { appointment_id: r.appointmentId, status: r.status });
}
