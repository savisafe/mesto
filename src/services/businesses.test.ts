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
    listArchivedBusinesses,
    getBusiness,
    createBusiness,
    updateBusiness,
    archiveBusiness,
    unarchiveBusiness,
    purgeExpiredArchives,
    ARCHIVE_RETENTION_DAYS,
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

describe('archiveBusiness', () => {
    it('FORBIDDEN если юзер не owner', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const other = await makeUser({ email: 'other@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id })
            .returning();

        await loginAs(other);
        const result = await archiveBusiness(biz.id);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('FORBIDDEN');
    });

    it('owner архивирует, бизнес исчезает из listBusinesses но остаётся в БД', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id })
            .returning();

        await loginAs(owner);
        const result = await archiveBusiness(biz.id);
        expect(result.ok).toBe(true);

        const list = await listBusinesses();
        if (!list.ok) throw new Error('list failed');
        expect(list.data).toHaveLength(0);

        const archived = await listArchivedBusinesses();
        if (!archived.ok) throw new Error('archived list failed');
        expect(archived.data).toHaveLength(1);
        expect(archived.data[0].archivedAt).toBeInstanceOf(Date);

        // Строка всё ещё в БД
        const stillThere = await db
            .select()
            .from(schema.businesses)
            .where(eq(schema.businesses.id, biz.id));
        expect(stillThere).toHaveLength(1);
    });

    it('идемпотентно — повторный архив не падает', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id })
            .returning();

        await loginAs(owner);
        await archiveBusiness(biz.id);
        const second = await archiveBusiness(biz.id);
        expect(second.ok).toBe(true);
    });

    it('updateBusiness на архивированный — ARCHIVED', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id, archivedAt: new Date() })
            .returning();

        await loginAs(owner);
        const result = await updateBusiness(biz.id, { name: 'New' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('ARCHIVED');
    });
});

describe('unarchiveBusiness', () => {
    it('возвращает бизнес из архива в основной список', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id, archivedAt: new Date() })
            .returning();

        await loginAs(owner);
        const result = await unarchiveBusiness(biz.id);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.archivedAt).toBeNull();

        const list = await listBusinesses();
        if (!list.ok) throw new Error('list failed');
        expect(list.data).toHaveLength(1);
    });

    it('FORBIDDEN для не-owner', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const other = await makeUser({ email: 'other@test.local' });
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'X', ownerId: owner.id, archivedAt: new Date() })
            .returning();

        await loginAs(other);
        const result = await unarchiveBusiness(biz.id);
        expect(result.ok).toBe(false);
    });
});

describe('purgeExpiredArchives', () => {
    it('удаляет только бизнесы старше retention', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const longAgo = new Date(Date.now() - (ARCHIVE_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000);
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [old] = await db
            .insert(schema.businesses)
            .values({ name: 'Old', ownerId: owner.id, archivedAt: longAgo })
            .returning();
        const [recent] = await db
            .insert(schema.businesses)
            .values({ name: 'Recent', ownerId: owner.id, archivedAt: yesterday })
            .returning();
        await db
            .insert(schema.businesses)
            .values({ name: 'Alive', ownerId: owner.id });

        const result = await purgeExpiredArchives();
        expect(result.purged).toBe(1);

        const remaining = await db.select().from(schema.businesses);
        expect(remaining.map((b) => b.id).sort()).toEqual([recent.id, /* alive */].concat(
            remaining.filter((b) => b.id !== recent.id && b.id !== old.id).map((b) => b.id),
        ).sort());
        // Старого нет, недавний и активный остались
        expect(remaining.find((b) => b.id === old.id)).toBeUndefined();
        expect(remaining).toHaveLength(2);
    });

    it('каскадно удаляет связанные сущности (клиенты, услуги, инвайты)', async () => {
        const owner = await makeUser({ email: 'owner@test.local' });
        const longAgo = new Date(Date.now() - (ARCHIVE_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000);
        const [biz] = await db
            .insert(schema.businesses)
            .values({ name: 'Old', ownerId: owner.id, archivedAt: longAgo })
            .returning();
        await db
            .insert(schema.clients)
            .values({ businessId: biz.id, name: 'Client', phone: '+1' });
        await db
            .insert(schema.services)
            .values({ businessId: biz.id, name: 'Service', durationMinutes: 60 });

        await purgeExpiredArchives();

        const clientsLeft = await db.select().from(schema.clients);
        const servicesLeft = await db.select().from(schema.services);
        expect(clientsLeft).toHaveLength(0);
        expect(servicesLeft).toHaveLength(0);
    });
});
