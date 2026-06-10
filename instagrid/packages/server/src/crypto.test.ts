import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { Encryptor } from './crypto';
import { MemoryAccountStore, putToken, readToken } from './accounts';

const key = () => randomBytes(32);

describe('Encryptor', () => {
    it('round-trips a token', () => {
        const enc = new Encryptor(key());
        const secret = 'IGAA-long-lived-token-123';
        const cipher = enc.encrypt(secret);
        expect(cipher).not.toContain(secret);
        expect(enc.decrypt(cipher)).toBe(secret);
    });

    it('rejects a wrong key', () => {
        const cipher = new Encryptor(key()).encrypt('x');
        expect(() => new Encryptor(key()).decrypt(cipher)).toThrow();
    });

    it('detects tampering (auth tag)', () => {
        const enc = new Encryptor(key());
        const cipher = enc.encrypt('x');
        const tampered = Buffer.from(cipher, 'base64');
        tampered[tampered.length - 1] ^= 0xff;
        expect(() => enc.decrypt(tampered.toString('base64'))).toThrow();
    });

    it('requires a 32-byte key', () => {
        expect(() => new Encryptor(randomBytes(16))).toThrow(/32 bytes/);
    });
});

describe('account token storage', () => {
    it('stores tokens encrypted and reads them back', () => {
        const enc = new Encryptor(key());
        const store = new MemoryAccountStore();
        const account = { provider: 'instagram', externalUserId: '42', username: 'studio' };

        putToken(store, enc, account, 'TOKEN', '2026-09-01T00:00:00Z');

        expect(store.get('42')?.encryptedToken).not.toContain('TOKEN');
        expect(readToken(store, enc, '42')).toBe('TOKEN');
        expect(readToken(store, enc, 'missing')).toBeNull();
    });
});
