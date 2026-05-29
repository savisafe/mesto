import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { businesses, businessMembers } from '@/db/schema';

// Проверка доступа к бизнесу: owner или member.
// Вынесен в общий модуль чтобы не дублировать в services/clients, employees, services и т.д.
export async function checkBusinessAccess(
    businessId: string,
    userId: string,
): Promise<'OWNER' | 'MEMBER' | null> {
    const [biz] = await db
        .select({ ownerId: businesses.ownerId })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
    if (!biz) return null;
    if (biz.ownerId === userId) return 'OWNER';
    const [member] = await db
        .select({ userId: businessMembers.userId })
        .from(businessMembers)
        .where(
            and(
                eq(businessMembers.businessId, businessId),
                eq(businessMembers.userId, userId),
            ),
        )
        .limit(1);
    return member ? 'MEMBER' : null;
}
