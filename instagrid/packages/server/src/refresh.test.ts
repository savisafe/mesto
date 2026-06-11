import { describe, it, expect, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { refreshDueTokens } from './refresh';
import { MemoryAccountStore, putToken } from './accounts';
import { Encryptor } from './crypto';

const NOW = 1_000_000_000_000;
const days = (n: number) => n * 24 * 60 * 60 * 1000;

const setup = () => {
    const enc = new Encryptor(randomBytes(32));
    const store = new MemoryAccountStore();
    const acc = (id: string) => ({ provider: 'instagram', externalUserId: id, username: id });
    // "soon" expires in 2 days (due), "later" in 30 days (skip).
    putToken(store, enc, acc('soon'), 'TOKEN_SOON', new Date(NOW + days(2)).toISOString());
    putToken(store, enc, acc('later'), 'TOKEN_LATER', new Date(NOW + days(30)).toISOString());
    return { enc, store };
};

describe('refreshDueTokens', () => {
    it('refreshes only tokens within the window and re-encrypts them', async () => {
        const { enc, store } = setup();
        const refresh = vi.fn(async (token: string) => ({
            accessToken: `${token}_NEW`,
            expiresAt: new Date(NOW + days(60)).toISOString(),
        }));

        const report = await refreshDueTokens({
            accountStore: store,
            encryptor: enc,
            refresh,
            withinMs: days(7),
            now: () => NOW,
        });

        expect(report.refreshed).toEqual(['soon']);
        expect(refresh).toHaveBeenCalledTimes(1);
        // New token stored, encrypted, with the extended expiry.
        const updated = store.get('soon')!;
        expect(enc.decrypt(updated.encryptedToken)).toBe('TOKEN_SOON_NEW');
        expect(updated.expiresAt).toBe(new Date(NOW + days(60)).toISOString());
        // Untouched.
        expect(enc.decrypt(store.get('later')!.encryptedToken)).toBe('TOKEN_LATER');
    });

    it('isolates failures per account', async () => {
        const { enc, store } = setup();
        const refresh = vi.fn(async () => {
            throw new Error('graph down');
        });
        const report = await refreshDueTokens({
            accountStore: store,
            encryptor: enc,
            refresh,
            withinMs: days(7),
            now: () => NOW,
        });
        expect(report.refreshed).toEqual([]);
        expect(report.failed).toEqual([{ externalUserId: 'soon', error: 'graph down' }]);
    });
});
