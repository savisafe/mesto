import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/db/schema';

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export async function createTestDb(): Promise<TestDb> {
    const pg = new PGlite();
    const db = drizzle(pg, { schema });
    await migrate(db, { migrationsFolder: './drizzle' });
    return db;
}

// Очищает все таблицы (для beforeEach между тестами).
// Удаляем в порядке зависимостей: дети → родители.
export async function resetDb(db: TestDb): Promise<void> {
    await db.delete(schema.businessMembers);
    await db.delete(schema.businesses);
    await db.delete(schema.emailTokens);
    await db.delete(schema.sessions);
    await db.delete(schema.users);
}
