import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, apiOk, apiError } from '@/lib/external-api';
import { getAvailability } from '@/services/availability';
import { matchService, matchMaster } from '@/services/external/bookings';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const auth = await requireAuth(req, 'availability:read');
    if (auth instanceof NextResponse) return auth;
    const { ctx } = auth;

    const sp = req.nextUrl.searchParams;
    const from = sp.get('from');
    const to = sp.get('to');
    if (!from || !to) return apiError(req, 400, 'INVALID_PAYLOAD', 'from и to обязательны', 'from');

    const svc = await matchService(
        ctx.businessId,
        sp.get('service_external_id'),
        sp.get('service_name') ?? '',
    );
    const employeeUserId = await matchMaster(ctx.businessId, sp.get('master_id'), sp.get('master_name'));
    const gran = sp.get('granularity_minutes');
    const granularityMinutes = gran && Number.isFinite(Number(gran)) ? Number(gran) : undefined;

    const days = await getAvailability({
        businessId: ctx.businessId,
        from,
        to,
        serviceId: svc?.id ?? null,
        employeeUserId,
        granularityMinutes,
    });
    return apiOk(req, {
        service: svc ? { id: svc.id, name: svc.name, duration_minutes: svc.durationMinutes } : null,
        days: days.map((d) => ({
            date: d.date,
            status: d.status,
            closed_reason: d.closedReason,
            slots: d.slots.map((s) => ({
                starts_at: s.startsAt,
                ends_at: s.endsAt,
                master_id: s.masterId,
                master_name: s.masterName,
            })),
        })),
    });
}
