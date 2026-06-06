import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

vi.mock('@/lib/auth', () => ({
    getCurrentUser: vi.fn(),
}));

vi.mock('@/services/email', () => ({
    sendInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { sendInviteEmail } from '@/services/email';
import { toPublicUser, type PublicUser } from '@/db/schema';
import {
    listMembers,
    inviteMember,
    revokeInvite,
    acceptInvite,
    removeMember,
} from './employees';

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockSendInvite = vi.mocked(sendInviteEmail);

async function makeUser(email: string): Promise<PublicUser> {
    const [u] = await db
        .insert(schema.users)
        .values({ email, passwordHash: 'argon2$test', name: email, phone: '+70000000000' })
        .returning();
    return toPublicUser(u);
}

async function makeBusiness(ownerId: string, name = 'Biz') {
    const [b] = await db.insert(schema.businesses).values({ name, ownerId }).returning();
    return b;
}

async function loginAs(user: PublicUser) {
    mockGetCurrentUser.mockResolvedValue(user);
}

beforeEach(async () => {
    await db.delete(schema.invites);
    await db.delete(schema.businessMembers);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue(null);
    mockSendInvite.mockReset();
    mockSendInvite.mockResolvedValue(undefined);
});

describe('listMembers', () => {
    it('UNAUTHORIZED без сессии', async () => {
        const r = await listMembers('00000000-0000-0000-0000-000000000000');
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('UNAUTHORIZED');
    });

    it('возвращает owner + members + pending invites', async () => {
        const owner = await makeUser('o@test.local');
        const employee = await makeUser('e@test.local');
        const biz = await makeBusiness(owner.id);
        await db
            .insert(schema.businessMembers)
            .values({ businessId: biz.id, userId: employee.id, role: 'EMPLOYEE' });
        await db.insert(schema.invites).values({
            businessId: biz.id,
            email: 'pending@test.local',
            role: 'MANAGER',
            tokenHash: 'hash1',
            invitedByUserId: owner.id,
            expiresAt: new Date(Date.now() + 60_000),
        });

        await loginAs(owner);
        const r = await listMembers(biz.id);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.isOwner).toBe(true);
        expect(r.data.members.map((m) => m.role).sort()).toEqual(['EMPLOYEE', 'OWNER']);
        expect(r.data.invites).toHaveLength(1);
    });

    it('expired и accepted инвайты не в списке', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        await db.insert(schema.invites).values([
            {
                businessId: biz.id,
                email: 'expired@test.local',
                role: 'EMPLOYEE',
                tokenHash: 'h1',
                invitedByUserId: owner.id,
                expiresAt: new Date(Date.now() - 1000),
            },
            {
                businessId: biz.id,
                email: 'accepted@test.local',
                role: 'EMPLOYEE',
                tokenHash: 'h2',
                invitedByUserId: owner.id,
                expiresAt: new Date(Date.now() + 60_000),
                acceptedAt: new Date(),
            },
            {
                businessId: biz.id,
                email: 'active@test.local',
                role: 'EMPLOYEE',
                tokenHash: 'h3',
                invitedByUserId: owner.id,
                expiresAt: new Date(Date.now() + 60_000),
            },
        ]);

        await loginAs(owner);
        const r = await listMembers(biz.id);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.invites).toHaveLength(1);
        expect(r.data.invites[0].email).toBe('active@test.local');
    });

    it('member видит состав но isOwner=false', async () => {
        const owner = await makeUser('o@test.local');
        const member = await makeUser('m@test.local');
        const biz = await makeBusiness(owner.id);
        await db
            .insert(schema.businessMembers)
            .values({ businessId: biz.id, userId: member.id, role: 'EMPLOYEE' });

        await loginAs(member);
        const r = await listMembers(biz.id);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.isOwner).toBe(false);
    });
});

describe('inviteMember', () => {
    it('FORBIDDEN для не-owner', async () => {
        const owner = await makeUser('o@test.local');
        const other = await makeUser('x@test.local');
        const biz = await makeBusiness(owner.id);
        await loginAs(other);
        const r = await inviteMember({
            businessId: biz.id,
            email: 'new@test.local',
            role: 'EMPLOYEE',
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('FORBIDDEN');
    });

    it('owner шлёт письмо и создаёт pending-инвайт', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        await loginAs(owner);

        const r = await inviteMember({
            businessId: biz.id,
            email: 'New@Test.LOCAL',
            role: 'MANAGER',
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        await new Promise((res) => setImmediate(res));

        expect(mockSendInvite).toHaveBeenCalledOnce();
        expect(mockSendInvite.mock.calls[0][0]).toBe('new@test.local');

        const stored = await db.select().from(schema.invites);
        expect(stored).toHaveLength(1);
        expect(stored[0].email).toBe('new@test.local');
        expect(stored[0].role).toBe('MANAGER');
    });

    it('нельзя пригласить самого себя', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        await loginAs(owner);

        const r = await inviteMember({
            businessId: biz.id,
            email: 'o@test.local',
            role: 'EMPLOYEE',
        });
        expect(r.ok).toBe(false);
    });

    it('нельзя пригласить уже-member', async () => {
        const owner = await makeUser('o@test.local');
        const member = await makeUser('m@test.local');
        const biz = await makeBusiness(owner.id);
        await db
            .insert(schema.businessMembers)
            .values({ businessId: biz.id, userId: member.id, role: 'EMPLOYEE' });

        await loginAs(owner);
        const r = await inviteMember({
            businessId: biz.id,
            email: 'm@test.local',
            role: 'MANAGER',
        });
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('ALREADY_MEMBER');
    });

    it('повторный invite отзывает старый и создаёт новый', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        await loginAs(owner);

        await inviteMember({ businessId: biz.id, email: 'x@test.local', role: 'EMPLOYEE' });
        await inviteMember({ businessId: biz.id, email: 'x@test.local', role: 'MANAGER' });

        const stored = await db.select().from(schema.invites);
        expect(stored).toHaveLength(2);
        const active = stored.filter((i) => i.revokedAt === null);
        expect(active).toHaveLength(1);
        expect(active[0].role).toBe('MANAGER');
    });
});

describe('acceptInvite', () => {
    it('UNAUTHORIZED без сессии', async () => {
        const r = await acceptInvite('whatever');
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('UNAUTHORIZED');
    });

    it('INVALID_TOKEN для несуществующего токена', async () => {
        const u = await makeUser('u@test.local');
        await loginAs(u);
        const r = await acceptInvite('not-a-real-token');
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('INVALID_TOKEN');
    });

    it('EMAIL_MISMATCH если инвайт на другой email', async () => {
        const owner = await makeUser('o@test.local');
        const other = await makeUser('other@test.local');
        const biz = await makeBusiness(owner.id);
        await loginAs(owner);
        await inviteMember({
            businessId: biz.id,
            email: 'invitee@test.local',
            role: 'EMPLOYEE',
        });
        await new Promise((r) => setImmediate(r));
        const token = mockSendInvite.mock.calls[0][3];

        await loginAs(other);
        const r = await acceptInvite(token);
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('EMAIL_MISMATCH');
    });

    it('успешно создаёт business_member и помечает инвайт accepted', async () => {
        const owner = await makeUser('o@test.local');
        const invitee = await makeUser('invitee@test.local');
        const biz = await makeBusiness(owner.id);

        await loginAs(owner);
        await inviteMember({
            businessId: biz.id,
            email: 'invitee@test.local',
            role: 'MANAGER',
        });
        await new Promise((r) => setImmediate(r));
        const token = mockSendInvite.mock.calls[0][3];

        await loginAs(invitee);
        const r = await acceptInvite(token);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.businessId).toBe(biz.id);
        expect(r.data.role).toBe('MANAGER');

        const [member] = await db
            .select()
            .from(schema.businessMembers)
            .where(eq(schema.businessMembers.userId, invitee.id));
        expect(member.role).toBe('MANAGER');

        const [inv] = await db.select().from(schema.invites);
        expect(inv.acceptedAt).not.toBeNull();
    });

    it('нельзя принять один токен дважды', async () => {
        const owner = await makeUser('o@test.local');
        const invitee = await makeUser('invitee@test.local');
        const biz = await makeBusiness(owner.id);

        await loginAs(owner);
        await inviteMember({
            businessId: biz.id,
            email: 'invitee@test.local',
            role: 'EMPLOYEE',
        });
        await new Promise((r) => setImmediate(r));
        const token = mockSendInvite.mock.calls[0][3];

        await loginAs(invitee);
        await acceptInvite(token);
        const second = await acceptInvite(token);
        expect(second.ok).toBe(false);
    });
});

describe('revokeInvite', () => {
    it('FORBIDDEN для не-owner', async () => {
        const owner = await makeUser('o@test.local');
        const other = await makeUser('x@test.local');
        const biz = await makeBusiness(owner.id);
        await loginAs(owner);
        await inviteMember({
            businessId: biz.id,
            email: 'i@test.local',
            role: 'EMPLOYEE',
        });
        const [inv] = await db.select().from(schema.invites);

        await loginAs(other);
        const r = await revokeInvite(inv.id);
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('FORBIDDEN');
    });

    it('owner отзывает', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        await loginAs(owner);
        await inviteMember({
            businessId: biz.id,
            email: 'i@test.local',
            role: 'EMPLOYEE',
        });
        const [inv] = await db.select().from(schema.invites);

        const r = await revokeInvite(inv.id);
        expect(r.ok).toBe(true);

        const [after] = await db.select().from(schema.invites);
        expect(after.revokedAt).not.toBeNull();
    });
});

describe('removeMember', () => {
    it('FORBIDDEN для не-owner', async () => {
        const owner = await makeUser('o@test.local');
        const member = await makeUser('m@test.local');
        const biz = await makeBusiness(owner.id);
        await db
            .insert(schema.businessMembers)
            .values({ businessId: biz.id, userId: member.id, role: 'EMPLOYEE' });

        await loginAs(member);
        const r = await removeMember(biz.id, member.id);
        expect(r.ok).toBe(false);
    });

    it('нельзя удалить владельца', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        await loginAs(owner);

        const r = await removeMember(biz.id, owner.id);
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.code).toBe('INVALID_TARGET');
    });

    it('owner удаляет сотрудника', async () => {
        const owner = await makeUser('o@test.local');
        const member = await makeUser('m@test.local');
        const biz = await makeBusiness(owner.id);
        await db
            .insert(schema.businessMembers)
            .values({ businessId: biz.id, userId: member.id, role: 'EMPLOYEE' });

        await loginAs(owner);
        const r = await removeMember(biz.id, member.id);
        expect(r.ok).toBe(true);

        const remaining = await db.select().from(schema.businessMembers);
        expect(remaining).toHaveLength(0);
    });
});
