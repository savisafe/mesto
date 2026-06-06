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
import { listClients, createClient, updateClient } from './clients';

const mockGetCurrentUser = vi.mocked(getCurrentUser);

async function makeUser(email: string, role: UserRole = 'OWNER'): Promise<PublicUser> {
    const [u] = await db
        .insert(schema.users)
        .values({ email, passwordHash: 'argon2$test', name: email, role, phone: '+70000000000' })
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

async function resetAll() {
    await db.delete(schema.clients);
    await db.delete(schema.businessMembers);
    await db.delete(schema.businesses);
    await db.delete(schema.users);
}

beforeEach(async () => {
    await resetAll();
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockResolvedValue(null);
});

describe('listClients', () => {
    it('UNAUTHORIZED без логина', async () => {
        const result = await listClients({ businessId: '00000000-0000-0000-0000-000000000000' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('UNAUTHORIZED');
    });

    it('FORBIDDEN если юзер не имеет доступа к бизнесу', async () => {
        const owner = await makeUser('o@test.local');
        const other = await makeUser('x@test.local');
        const biz = await makeBusiness(owner.id);

        await loginAs(other);
        const result = await listClients({ businessId: biz.id });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('FORBIDDEN');
    });

    it('возвращает клиентов бизнеса с пагинацией', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        for (let i = 0; i < 30; i++) {
            await db
                .insert(schema.clients)
                .values({ businessId: biz.id, name: `Client ${i}`, phone: `+7000000${i}` });
        }

        await loginAs(owner);
        const page1 = await listClients({ businessId: biz.id, perPage: 10, page: 1 });
        expect(page1.ok).toBe(true);
        if (!page1.ok) return;
        expect(page1.data.clients).toHaveLength(10);
        expect(page1.data.total).toBe(30);

        const page3 = await listClients({ businessId: biz.id, perPage: 10, page: 3 });
        expect(page3.ok).toBe(true);
        if (!page3.ok) return;
        expect(page3.data.clients).toHaveLength(10);
    });

    it('search по имени case-insensitive', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        await db.insert(schema.clients).values({ businessId: biz.id, name: 'Анна Иванова', phone: '+111' });
        await db.insert(schema.clients).values({ businessId: biz.id, name: 'Борис Петров', phone: '+222' });
        await db.insert(schema.clients).values({ businessId: biz.id, name: 'анатолий Сидоров', phone: '+333' });

        await loginAs(owner);
        // 'ан' матчит и 'Анна' и 'анатолий' (case-insensitive)
        const result = await listClients({ businessId: biz.id, search: 'ан' });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.clients).toHaveLength(2);
        expect(result.data.clients.map((c) => c.name).sort()).toEqual([
            'Анна Иванова',
            'анатолий Сидоров',
        ]);
    });

    it('search по телефону', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        await db.insert(schema.clients).values({ businessId: biz.id, name: 'A', phone: '+77001234567' });
        await db.insert(schema.clients).values({ businessId: biz.id, name: 'B', phone: '+77777777777' });

        await loginAs(owner);
        const result = await listClients({ businessId: biz.id, search: '1234' });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.clients).toHaveLength(1);
        expect(result.data.clients[0].name).toBe('A');
    });

    it('member бизнеса тоже видит клиентов', async () => {
        const owner = await makeUser('o@test.local');
        const member = await makeUser('m@test.local', 'EMPLOYEE');
        const biz = await makeBusiness(owner.id);
        await db.insert(schema.businessMembers).values({
            businessId: biz.id,
            userId: member.id,
            role: 'EMPLOYEE',
        });
        await db.insert(schema.clients).values({ businessId: biz.id, name: 'C', phone: '+111' });

        await loginAs(member);
        const result = await listClients({ businessId: biz.id });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.clients).toHaveLength(1);
    });
});

describe('createClient', () => {
    it('UNAUTHORIZED без логина', async () => {
        const result = await createClient({ businessId: 'x', name: 'A', phone: '+1' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('UNAUTHORIZED');
    });

    it('FORBIDDEN без доступа к бизнесу', async () => {
        const owner = await makeUser('o@test.local');
        const other = await makeUser('x@test.local');
        const biz = await makeBusiness(owner.id);

        await loginAs(other);
        const result = await createClient({ businessId: biz.id, name: 'A', phone: '+1' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('FORBIDDEN');
    });

    it('INVALID_NAME для пустого имени', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);

        await loginAs(owner);
        const result = await createClient({ businessId: biz.id, name: '   ', phone: '+1' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('INVALID_NAME');
    });

    it('INVALID_PHONE для пустого телефона', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);

        await loginAs(owner);
        const result = await createClient({ businessId: biz.id, name: 'A', phone: '' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('INVALID_PHONE');
    });

    it('owner создаёт клиента, дефолтный isBlacklisted=false', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);

        await loginAs(owner);
        const result = await createClient({
            businessId: biz.id,
            name: '  Foo  ',
            phone: '  +777  ',
            email: '  foo@bar  ',
            note: '  test  ',
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.name).toBe('Foo');
        expect(result.data.phone).toBe('+777');
        expect(result.data.email).toBe('foo@bar');
        expect(result.data.note).toBe('test');
        expect(result.data.isBlacklisted).toBe(false);
    });
});

describe('updateClient', () => {
    it('NOT_FOUND если клиент не существует', async () => {
        const owner = await makeUser('o@test.local');
        await loginAs(owner);
        const result = await updateClient('00000000-0000-0000-0000-000000000000', { name: 'X' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('NOT_FOUND');
    });

    it('FORBIDDEN если юзер не имеет доступа к бизнесу клиента', async () => {
        const owner = await makeUser('o@test.local');
        const other = await makeUser('x@test.local');
        const biz = await makeBusiness(owner.id);
        const [c] = await db
            .insert(schema.clients)
            .values({ businessId: biz.id, name: 'A', phone: '+1' })
            .returning();

        await loginAs(other);
        const result = await updateClient(c.id, { name: 'B' });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('FORBIDDEN');
    });

    it('переключает isBlacklisted', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        const [c] = await db
            .insert(schema.clients)
            .values({ businessId: biz.id, name: 'A', phone: '+1' })
            .returning();

        await loginAs(owner);
        const result = await updateClient(c.id, { isBlacklisted: true });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.isBlacklisted).toBe(true);
    });
});

describe('каскадное удаление клиентов при удалении бизнеса', () => {
    it('клиенты удаляются вместе с бизнесом', async () => {
        const owner = await makeUser('o@test.local');
        const biz = await makeBusiness(owner.id);
        await db
            .insert(schema.clients)
            .values({ businessId: biz.id, name: 'A', phone: '+1' });

        await db.delete(schema.businesses).where(eq(schema.businesses.id, biz.id));

        const remaining = await db.select().from(schema.clients);
        expect(remaining).toHaveLength(0);
    });
});
