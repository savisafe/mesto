import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | undefined;

function getDb(): Db {
    if (_db) return _db;
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error('DATABASE_URL is not set');
    }
    _db = drizzle(neon(url), { schema });
    return _db;
}

// Ленивый прокси: neon() не зовётся пока никто не дёрнет метод db.
// Это нужно чтобы build/prerender не падал при отсутствии DATABASE_URL
// (например, на CI без подтянутых envs).
export const db: Db = new Proxy({} as Db, {
    get(_target, prop, receiver) {
        return Reflect.get(getDb() as object, prop, receiver);
    },
});
