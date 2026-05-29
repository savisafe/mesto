import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, apiOk } from '@/lib/external-api';
import { getBusinessTeam } from '@/services/availability';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const members = await getBusinessTeam(auth.ctx.businessId);
    return apiOk(req, { members: members.map((m) => ({ id: m.id, name: m.name })) });
}
