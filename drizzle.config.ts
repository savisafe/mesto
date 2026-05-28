import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

config({ path: '.env.local' });
config();

export default {
    schema: './src/db/schema/index.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    strict: true,
    verbose: true,
} satisfies Config;
