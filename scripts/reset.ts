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

// Guardrail: на всякий случай не даём ронять prod-БД.
// Если урл явно production-like — требуем флаг --force.
const url = process.env.DATABASE_URL;
const isProd =
    /\/prod($|\?)/.test(url) ||
    /production/i.test(url) ||
    process.env.NODE_ENV === 'production';
if (isProd && !process.argv.includes('--force')) {
    console.error(
        'DATABASE_URL похож на production. Откажусь дропать без --force.',
    );
    process.exit(1);
}

neonConfig.webSocketConstructor = ws;

async function main() {
    const pool = new Pool({ connectionString: url });
    console.log('Dropping public schema...');
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    console.log('Re-applying migrations...');
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Database reset complete.');
    await pool.end();
}

main().catch((err) => {
    console.error('Reset failed:', err);
    process.exit(1);
});
