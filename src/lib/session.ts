import 'server-only';
import { eq, lt } from 'drizzle-orm';
import { db } from '@/db';
import { sessions, users, type Session, type User } from '@/db/schema';
import { randomToken, sha256 } from './crypto';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionWithUser {
    user: User;
    session: Session;
}

export interface CreateSessionInput {
    userId: string;
    userAgent?: string | null;
    ip?: string | null;
}

export async function createSession(
    input: CreateSessionInput,
): Promise<{ token: string; expiresAt: Date }> {
    const token = randomToken();
    const id = sha256(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await db.insert(sessions).values({
        id,
        userId: input.userId,
        expiresAt,
        userAgent: input.userAgent ?? null,
        ip: input.ip ?? null,
    });

    return { token, expiresAt };
}

export async function validateSession(token: string): Promise<SessionWithUser | null> {
    const id = sha256(token);

    const rows = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.id, id))
        .limit(1);

    if (rows.length === 0) return null;

    const { session, user } = rows[0];

    if (session.expiresAt.getTime() <= Date.now()) {
        await db.delete(sessions).where(eq(sessions.id, id));
        return null;
    }

    const msRemaining = session.expiresAt.getTime() - Date.now();
    if (msRemaining < SESSION_REFRESH_THRESHOLD_MS) {
        const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
        await db
            .update(sessions)
            .set({ expiresAt: newExpiresAt })
            .where(eq(sessions.id, id));
        session.expiresAt = newExpiresAt;
    }

    return { session, user };
}

export async function invalidateSession(token: string): Promise<void> {
    const id = sha256(token);
    await db.delete(sessions).where(eq(sessions.id, id));
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
}

// Удаляет протухшие сессии. Звать кроном или из admin-скрипта.
export async function cleanupExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
