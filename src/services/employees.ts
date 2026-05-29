import 'server-only';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/db';
import {
    users,
    businesses,
    businessMembers,
    invites,
    businessMemberRoles,
    type BusinessMemberRole,
    type Invite,
} from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { randomToken, sha256 } from '@/lib/crypto';
import { sendInviteEmail } from './email';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

export type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; code?: string };

const UNAUTHORIZED = { ok: false as const, error: 'Не авторизован', code: 'UNAUTHORIZED' as const };
const FORBIDDEN = { ok: false as const, error: 'Нет доступа', code: 'FORBIDDEN' as const };
const NOT_FOUND = { ok: false as const, error: 'Не найдено', code: 'NOT_FOUND' as const };

export interface Member {
    id: string;
    name: string;
    email: string;
    role: 'OWNER' | BusinessMemberRole;
}

export interface PendingInvite {
    id: string;
    email: string;
    role: BusinessMemberRole;
    expiresAt: Date;
    createdAt: Date;
}

export interface ListMembersResult {
    business: { id: string; name: string };
    members: Member[];
    invites: PendingInvite[];
    isOwner: boolean;
}

async function getBusinessAccess(
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

export async function listMembers(
    businessId: string,
): Promise<ServiceResult<ListMembersResult>> {
    const me = await getCurrentUser();
    if (!me) return UNAUTHORIZED;

    const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
    if (!biz) return NOT_FOUND;

    const access = await getBusinessAccess(businessId, me.id);
    if (!access) return FORBIDDEN;

    const isOwner = access === 'OWNER';

    const [owner] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, biz.ownerId))
        .limit(1);

    const memberRows = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: businessMembers.role,
        })
        .from(businessMembers)
        .innerJoin(users, eq(users.id, businessMembers.userId))
        .where(eq(businessMembers.businessId, businessId))
        .orderBy(users.name);

    const members: Member[] = [
        { id: owner.id, name: owner.name, email: owner.email, role: 'OWNER' },
        ...memberRows.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role,
        })),
    ];

    // Только активные приглашения (не accepted, не revoked, не expired).
    const inviteRows = await db
        .select({
            id: invites.id,
            email: invites.email,
            role: invites.role,
            expiresAt: invites.expiresAt,
            createdAt: invites.createdAt,
        })
        .from(invites)
        .where(
            and(
                eq(invites.businessId, businessId),
                isNull(invites.acceptedAt),
                isNull(invites.revokedAt),
                gt(invites.expiresAt, new Date()),
            ),
        )
        .orderBy(desc(invites.createdAt));

    return {
        ok: true,
        data: {
            business: { id: biz.id, name: biz.name },
            members,
            invites: inviteRows,
            isOwner,
        },
    };
}

export interface InviteMemberInput {
    businessId: string;
    email: string;
    role: BusinessMemberRole;
}

export async function inviteMember(
    input: InviteMemberInput,
): Promise<ServiceResult<{ id: string; email: string }>> {
    const me = await getCurrentUser();
    if (!me) return UNAUTHORIZED;

    if (!businessMemberRoles.includes(input.role)) {
        return { ok: false, error: 'Некорректная роль', code: 'INVALID_ROLE' };
    }

    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: 'Некорректный email', code: 'INVALID_EMAIL' };
    }

    const [biz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, input.businessId))
        .limit(1);
    if (!biz) return NOT_FOUND;
    if (biz.ownerId !== me.id) return FORBIDDEN;

    if (email === me.email) {
        return { ok: false, error: 'Нельзя пригласить самого себя', code: 'INVALID_EMAIL' };
    }

    // Если уже member — отказ.
    const [existingMember] = await db
        .select({ userId: businessMembers.userId })
        .from(businessMembers)
        .innerJoin(users, eq(users.id, businessMembers.userId))
        .where(and(eq(businessMembers.businessId, input.businessId), eq(users.email, email)))
        .limit(1);
    if (existingMember) {
        return { ok: false, error: 'Этот email уже в команде', code: 'ALREADY_MEMBER' };
    }

    // Если есть активный pending-инвайт — переиспользуем (отзовём старый, выпустим новый).
    await db
        .update(invites)
        .set({ revokedAt: new Date() })
        .where(
            and(
                eq(invites.businessId, input.businessId),
                eq(invites.email, email),
                isNull(invites.acceptedAt),
                isNull(invites.revokedAt),
            ),
        );

    const token = randomToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const [created] = await db
        .insert(invites)
        .values({
            businessId: input.businessId,
            email,
            role: input.role,
            tokenHash,
            invitedByUserId: me.id,
            expiresAt,
        })
        .returning();

    void sendInviteEmail(email, biz.name, me.name, token).catch((err) => {
        console.error('Failed to send invite email:', err);
    });

    return { ok: true, data: { id: created.id, email: created.email } };
}

export async function revokeInvite(id: string): Promise<ServiceResult<{ id: string }>> {
    const me = await getCurrentUser();
    if (!me) return UNAUTHORIZED;

    const [inv] = await db
        .select({ businessId: invites.businessId, acceptedAt: invites.acceptedAt, revokedAt: invites.revokedAt })
        .from(invites)
        .where(eq(invites.id, id))
        .limit(1);
    if (!inv) return NOT_FOUND;

    const [biz] = await db
        .select({ ownerId: businesses.ownerId })
        .from(businesses)
        .where(eq(businesses.id, inv.businessId))
        .limit(1);
    if (!biz || biz.ownerId !== me.id) return FORBIDDEN;

    if (inv.acceptedAt || inv.revokedAt) {
        return { ok: false, error: 'Приглашение уже неактивно', code: 'INVALID_STATE' };
    }

    await db.update(invites).set({ revokedAt: new Date() }).where(eq(invites.id, id));
    return { ok: true, data: { id } };
}

export async function acceptInvite(
    token: string,
): Promise<ServiceResult<{ businessId: string; role: BusinessMemberRole }>> {
    const me = await getCurrentUser();
    if (!me) return UNAUTHORIZED;

    const tokenHash = sha256(token);
    const [inv] = await db
        .select()
        .from(invites)
        .where(
            and(
                eq(invites.tokenHash, tokenHash),
                isNull(invites.acceptedAt),
                isNull(invites.revokedAt),
                gt(invites.expiresAt, new Date()),
            ),
        )
        .limit(1);
    if (!inv) {
        return { ok: false, error: 'Ссылка недействительна или истекла', code: 'INVALID_TOKEN' };
    }

    if (inv.email.toLowerCase() !== me.email.toLowerCase()) {
        return {
            ok: false,
            error: 'Приглашение оформлено на другой email — войдите под нужным аккаунтом',
            code: 'EMAIL_MISMATCH',
        };
    }

    // Если уже member — просто помечаем accepted без вставки.
    const [existing] = await db
        .select({ userId: businessMembers.userId })
        .from(businessMembers)
        .where(
            and(
                eq(businessMembers.businessId, inv.businessId),
                eq(businessMembers.userId, me.id),
            ),
        )
        .limit(1);
    if (!existing) {
        await db.insert(businessMembers).values({
            businessId: inv.businessId,
            userId: me.id,
            role: inv.role,
        });
    }

    await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, inv.id));
    return { ok: true, data: { businessId: inv.businessId, role: inv.role } };
}

export async function removeMember(
    businessId: string,
    userId: string,
): Promise<ServiceResult<{ userId: string }>> {
    const me = await getCurrentUser();
    if (!me) return UNAUTHORIZED;

    const [biz] = await db
        .select({ ownerId: businesses.ownerId })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
    if (!biz) return NOT_FOUND;
    if (biz.ownerId !== me.id) return FORBIDDEN;
    if (userId === biz.ownerId) {
        return { ok: false, error: 'Нельзя удалить владельца', code: 'INVALID_TARGET' };
    }

    await db
        .delete(businessMembers)
        .where(
            and(
                eq(businessMembers.businessId, businessId),
                eq(businessMembers.userId, userId),
            ),
        );

    return { ok: true, data: { userId } };
}

export type { Invite };
