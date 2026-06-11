import 'server-only';
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
    businesses,
    businessMembers,
    clients,
    appointments,
    type Business,
} from '@/db/schema';

export interface DashboardStats {
    businesses: Business[];
    totalClients: number;
    totalMembers: number;
    scheduledAppointments: number;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
    const memberships = await db
        .select({ id: businessMembers.businessId })
        .from(businessMembers)
        .where(eq(businessMembers.userId, userId));
    const memberBizIds = memberships.map((m) => m.id);

    const ownership =
        memberBizIds.length > 0
            ? or(eq(businesses.ownerId, userId), inArray(businesses.id, memberBizIds))
            : eq(businesses.ownerId, userId);

    // Дашборд показывает только активные бизнесы: не в архиве (archivedAt IS NULL)
    // и не выключенные владельцем (isActive = true). Счётчики ниже агрегируются
    // по этому же списку, чтобы цифры соответствовали показанным карточкам.
    const ownedAndMember = await db
        .select()
        .from(businesses)
        .where(and(ownership, isNull(businesses.archivedAt), eq(businesses.isActive, true)));

    if (ownedAndMember.length === 0) {
        return {
            businesses: [],
            totalClients: 0,
            totalMembers: 0,
            scheduledAppointments: 0,
        };
    }

    const bizIds = ownedAndMember.map((b) => b.id);

    const [clientAgg, memberAgg, apptAgg] = await Promise.all([
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(clients)
            .where(inArray(clients.businessId, bizIds)),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(businessMembers)
            .where(inArray(businessMembers.businessId, bizIds)),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(appointments)
            .where(
                and(
                    inArray(appointments.businessId, bizIds),
                    eq(appointments.status, 'scheduled'),
                ),
            ),
    ]);

    return {
        businesses: ownedAndMember,
        totalClients: clientAgg[0]?.count ?? 0,
        totalMembers: memberAgg[0]?.count ?? 0,
        scheduledAppointments: apptAgg[0]?.count ?? 0,
    };
}
