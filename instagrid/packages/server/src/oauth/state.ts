import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const b64url = (buf: Buffer): string => buf.toString('base64url');

export interface StatePayload {
    /** Feed the connection should populate (bound by the caller). */
    feedId: string;
    nonce: string;
    /** Issued-at, ms. */
    iat: number;
}

const sign = (body: string, secret: string): string =>
    b64url(createHmac('sha256', secret).update(body).digest());

/** Stateless, signed OAuth `state` — protects the callback from CSRF/replay. */
export function signState(payload: StatePayload, secret: string): string {
    const body = b64url(Buffer.from(JSON.stringify(payload)));
    return `${body}.${sign(body, secret)}`;
}

export function createState(feedId: string, secret: string, now: () => number = Date.now): string {
    return signState({ feedId, nonce: randomBytes(8).toString('hex'), iat: now() }, secret);
}

export function verifyState(
    state: string,
    secret: string,
    opts: { maxAgeMs?: number; now?: () => number } = {},
): StatePayload | null {
    const maxAgeMs = opts.maxAgeMs ?? 600_000; // 10 min
    const now = opts.now ?? Date.now;

    const parts = state.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    if (!body || !sig) return null;

    const expected = sign(body, secret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    let payload: StatePayload;
    try {
        payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StatePayload;
    } catch {
        return null;
    }
    if (typeof payload.iat !== 'number' || now() - payload.iat > maxAgeMs) return null;
    return payload;
}
