import 'server-only';
import { randomBytes, createHash } from 'crypto';

export function randomToken(): string {
    return randomBytes(32).toString('base64url');
}

export function sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}
