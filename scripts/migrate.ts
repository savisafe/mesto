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

neonConfig.webSocketConstructor = ws;

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    console.log('Applying migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Done.');

    await pool.end();
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
