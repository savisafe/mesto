import { config } from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import ws from 'ws';

config({ path: '.env.local' });
config();

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

const url = process.env.DATABASE_URL;
const isProd =
    /\/prod($|\?)/.test(url) ||
    /production/i.test(url) ||
    process.env.NODE_ENV === 'production';
if (isProd && !process.argv.includes('--force')) {
    console.error('DATABASE_URL похож на production. Откажусь дропать без --force.');
    process.exit(1);
}

neonConfig.webSocketConstructor = ws;

async function main() {
    const pool = new Pool({ connectionString: url });

    // Дропаем таблицы по одной, без DROP SCHEMA — так не задеваем
    // permissions/search_path на схему public (на Neon это иногда
    // приводит к 'permission denied for schema public').
    const { rows: tables } = await pool.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );
    if (tables.length === 0) {
        console.log('Public schema уже пустая.');
    } else {
        console.log(`Dropping ${tables.length} tables: ${tables.map((t) => t.tablename).join(', ')}`);
        for (const { tablename } of tables) {
            await pool.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
        }
    }

    console.log('Applying migrations...');
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Database reset complete.');
    await pool.end();
}

main().catch((err) => {
    console.error('Reset failed:', err);
    process.exit(1);
});
