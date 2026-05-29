import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateBearer, hasScope, type ApiAuthContext, type ApiKeyScope } from './api-auth';
import type { ExternalBookingDetail } from '@/services/external/bookings';

function echoId(req: NextRequest, res: NextResponse): void {
    const id = req.headers.get('x-request-id');
    if (id) res.headers.set('X-Request-Id', id);
}

export function apiOk(
    req: NextRequest,
    body: Record<string, unknown>,
    status = 200,
): NextResponse {
    const res = NextResponse.json({ ok: true, ...body }, { status });
    echoId(req, res);
    return res;
}

export function apiError(
    req: NextRequest,
    status: number,
    code: string,
    error: string,
    field?: string,
): NextResponse {
    const body: Record<string, unknown> = { ok: false, code, error };
    if (field) body.field = field;
    const res = NextResponse.json(body, { status });
    echoId(req, res);
    return res;
}

/** Bearer-аутентификация + опциональный scope-чек. Возвращает контекст или готовый Response с ошибкой. */
export async function requireAuth(
    req: NextRequest,
    scope?: ApiKeyScope,
): Promise<{ ctx: ApiAuthContext } | NextResponse> {
    const auth = await authenticateBearer(req.headers.get('authorization'));
    if (!auth.ok) return apiError(req, auth.status, auth.code, auth.error);
    if (scope && !hasScope(auth.ctx, scope)) {
        return apiError(req, 403, 'SCOPE_DENIED', `Требуется scope ${scope}`);
    }
    return { ctx: auth.ctx };
}

const BOOKING_HTTP: Record<string, number> = {
    INVALID_PAYLOAD: 400,
    NOT_FOUND: 404,
    OUT_OF_HOURS: 422,
    BLOCKED: 422,
    SLOT_CONFLICT: 409,
    BUSINESS_INACTIVE: 422,
};

export function bookingErrorStatus(code: string): number {
    return BOOKING_HTTP[code] ?? 400;
}

export function bookingDetailJson(d: ExternalBookingDetail) {
    return {
        appointment_id: d.appointmentId,
        status: d.status,
        starts_at: d.startsAt.toISOString(),
        ends_at: d.endsAt.toISOString(),
        client: { id: d.client.id, name: d.client.name, phone: d.client.phone },
        service: d.service
            ? { id: d.service.id, name: d.service.name, amount: d.amount, currency: d.currency }
            : null,
        master: d.master ? { id: d.master.id, name: d.master.name } : null,
        created_at: d.createdAt.toISOString(),
    };
}
