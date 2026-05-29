import 'server-only';
import { eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
    businesses,
    businessMembers,
    clients,
    type Business,
} from '@/db/schema';

export interface DashboardStats {
    businesses: Business[];
    totalClients: number;
    totalMembers: number;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
    const memberships = await db
        .select({ id: businessMembers.businessId })
        .from(businessMembers)
        .where(eq(businessMembers.userId, userId));
    const memberBizIds = memberships.map((m) => m.id);

    const ownedAndMember = await db
        .select()
        .from(businesses)
        .where(
            memberBizIds.length > 0
                ? or(eq(businesses.ownerId, userId), inArray(businesses.id, memberBizIds))
                : eq(businesses.ownerId, userId),
        );

    if (ownedAndMember.length === 0) {
        return { businesses: [], totalClients: 0, totalMembers: 0 };
    }

    const bizIds = ownedAndMember.map((b) => b.id);

    const [clientAgg, memberAgg] = await Promise.all([
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(clients)
            .where(inArray(clients.businessId, bizIds)),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(businessMembers)
            .where(inArray(businessMembers.businessId, bizIds)),
    ]);

    return {
        businesses: ownedAndMember,
        totalClients: clientAgg[0]?.count ?? 0,
        totalMembers: memberAgg[0]?.count ?? 0,
    };
}
