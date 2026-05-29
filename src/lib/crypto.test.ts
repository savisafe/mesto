import { describe, it, expect } from 'vitest';
import { randomToken, sha256 } from './crypto';

describe('randomToken', () => {
    it('возвращает url-safe base64 строку без padding', () => {
        const token = randomToken();
        expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(token).not.toContain('=');
    });

    it('возвращает разные значения при разных вызовах', () => {
        const tokens = new Set(Array.from({ length: 100 }, () => randomToken()));
        expect(tokens.size).toBe(100);
    });

    it('имеет достаточную длину для криптографической стойкости (≥40 символов)', () => {
        expect(randomToken().length).toBeGreaterThanOrEqual(40);
    });
});

describe('sha256', () => {
    it('детерминирован', () => {
        expect(sha256('hello')).toBe(sha256('hello'));
    });

    it('возвращает hex 64 символа', () => {
        expect(sha256('whatever')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('разные входы → разные хэши', () => {
        expect(sha256('a')).not.toBe(sha256('b'));
    });
});
