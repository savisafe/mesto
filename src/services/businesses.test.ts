import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/db', async () => {
    const { createTestDb } = await import('../../tests/db');
    const db = await createTestDb();
    return { db };
});

vi.mock('@/lib/auth', () => ({
    getCurrentUser: vi.fn(),
}));

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { toPublicUser, type PublicUser, type UserRole } from '@/db/schema';
import {
    listBusinesses,
    getBusiness,
    createBusiness,
    updateBusiness,
    deleteBusiness,
} from './businesses';

const mockGetCurrentUser = vi.mocked(getCurrentUser);

async function makeUser(opts: { email: string; role?: UserRole }): Promise<PublicUser> {
    const [user] = await db
        .insert(schema.users)
        .values({
            email: opts.email,
            passwordHash: 'argon2$test',
            name: opts.email,
            role: opts.role ?? 'OWNER',
        })
        .returning();
    return toPublicUser(user);
}

async function loginAs(user: PublicUser) {
    mockGetCurrentUser.mockResolvedValue(user);
}

async function resetAll() {
    await db.delete(schema.businessMembers);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
}

beforeEach(async () => {
    await resetAll();
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue(null);
});

describe('listBusinesses', () => {
    it('UNAUTHORIZED без авторизации', async () => {
        const result = await listBusinesses();
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('UNAUTHORIZED');
    });

    it('возвращает свои бизнесы', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        await db.insert(schema.businesses).values({ name: 'A', ownerId: owner.id });
        await db.insert(schema.businesses).values({ name: 'B', ownerId: owner.id });

        await loginAs(owner);
        const result = await listBusinesses();
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data).toHaveLength(2);
        expect(result.data.map((b) => b.name).sort()).toEqual(['A', 'B']);
    });

    it('возвращает бизнесы где юзер — member', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const member = await makeUser({ email: 'member@test.local', role: 'EMPLOYEE' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'Shared', ownerId: owner.id })
            .returning();
        await db.insert(schema.businessMembers).values({
            businessId: biz.id,
            userId: member.id,
            role: 'EMPLOYEE',
        });

        await loginAs(member);
        const result = await listBusinesses();
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Shared');
    });

    it('не возвращает бизнесы где юзер не владелец и не member', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const other = await makeUser({ email: 'other@test.local' });
        await db.insert(schema.businesses).values({ name: 'Private', ownerId: owner.id });

        await loginAs(other);
        const result = await listBusinesses();
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data).toHaveLength(0);
    });
});

describe('getBusiness', () => {
    it('NOT_FOUND если id не существует', async () => {
        const user = await makeUser({ email: 'u@test.local' });
        await loginAs(user);
        const result = await getBusiness('00000000-0000-0000-0000-000000000000');
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('NOT_FOUND');
    });

    it('FORBIDDEN если юзер не owner и не member', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const other = await makeUser({ email: 'other@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id })
            .returning();

        await loginAs(other);
        const result = await getBusiness(biz.id);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('FORBIDDEN');
    });

    it('возвращает бизнес если юзер — owner', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id })
            .returning();

        await loginAs(owner);
        const result = await getBusiness(biz.id);
        expect(result.ok).toBe(true);
    });
});

describe('createBusiness', () => {
    it('UNAUTHORIZED без авторизации', async () => {
        const result = await createBusiness({ name: 'X' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('UNAUTHORIZED');
    });

    it('FORBIDDEN для роли EMPLOYEE', async () => {
        const employee = await makeUser({ email: 'e@test.local', role: 'EMPLOYEE' });
        await loginAs(employee);

        const result = await createBusiness({ name: 'X' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('FORBIDDEN');
    });

    it('успех для OWNER', async () => {
        const owner = await makeUser({ email: 'o@test.local', role: 'OWNER' });
        await loginAs(owner);

        const result = await createBusiness({ name: 'My Biz', description: 'desc' });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.name).toBe('My Biz');
        expect(result.data.ownerId).toBe(owner.id);
    });

    it('успех для ADMIN', async () => {
        const admin = await makeUser({ email: 'a@test.local', role: 'ADMIN' });
        await loginAs(admin);

        const result = await createBusiness({ name: 'Admin Biz' });
        expect(result.ok).toBe(true);
    });

    it('INVALID_NAME для пустого названия', async () => {
        const owner = await makeUser({ email: 'o@test.local' });
        await loginAs(owner);

        const result = await createBusiness({ name: '   ' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('INVALID_NAME');
    });

    it('тримит название и описание', async () => {
        const owner = await makeUser({ email: 'o@test.local' });
        await loginAs(owner);

        const result = await createBusiness({ name: '  My  ', description: '  d  ' });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.name).toBe('My');
        expect(result.data.description).toBe('d');
    });
});

describe('updateBusiness', () => {
    it('FORBIDDEN если юзер не owner', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const other = await makeUser({ email: 'other@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id })
            .returning();

        await loginAs(other);
        const result = await updateBusiness(biz.id, { name: 'New' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('FORBIDDEN');
    });

    it('owner может обновить', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id })
            .returning();

        await loginAs(owner);
        const result = await updateBusiness(biz.id, { name: 'Renamed' });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.name).toBe('Renamed');
    });

    it('INVALID_NAME при попытке записать пустое имя', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id })
            .returning();

        await loginAs(owner);
        const result = await updateBusiness(biz.id, { name: '   ' });
        expect(result.ok).toBe(false);
    });
});

describe('deleteBusiness', () => {
    it('FORBIDDEN если юзер не owner', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const other = await makeUser({ email: 'other@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id })
            .returning();

        await loginAs(other);
        const result = await deleteBusiness(biz.id);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('FORBIDDEN');
    });

    it('owner удаляет, бизнес исчезает', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id })
            .returning();

        await loginAs(owner);
        const result = await deleteBusiness(biz.id);
        expect(result.ok).toBe(true);

        const remaining = await db
            .select()
            .from(schema.businesses)
            .where(eq(schema.businesses.id, biz.id));
        expect(remaining).toHaveLength(0);
    });
});
