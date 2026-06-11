import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * Authenticated symmetric encryption for tokens at rest (AES-256-GCM).
 * Output is base64(iv | tag | ciphertext). Decryption fails loudly if the
 * payload was tampered with or the key is wrong.
 */
export class Encryptor {
    constructor(private readonly key: Buffer) {
        if (key.length !== 32) throw new Error('Encryptor key must be 32 bytes');
    }

    /** Build from a base64-encoded 32-byte key (e.g. an env secret). */
    static fromBase64(b64: string): Encryptor {
        return new Encryptor(Buffer.from(b64, 'base64'));
    }

    encrypt(plain: string): string {
        const iv = randomBytes(IV_LEN);
        const cipher = createCipheriv(ALGO, this.key, iv);
        const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return Buffer.concat([iv, tag, ct]).toString('base64');
    }

    decrypt(payload: string): string {
        const buf = Buffer.from(payload, 'base64');
        const iv = buf.subarray(0, IV_LEN);
        const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
        const ct = buf.subarray(IV_LEN + TAG_LEN);
        const decipher = createDecipheriv(ALGO, this.key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
    }
}
