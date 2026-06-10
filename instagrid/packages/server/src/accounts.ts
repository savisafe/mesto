import type { ConnectedAccount } from '@instagrid/core';
import type { Encryptor } from './crypto';

export interface StoredAccount {
    account: ConnectedAccount;
    /** Token encrypted at rest — never stored or returned in clear. */
    encryptedToken: string;
    /** ISO 8601 token expiry. */
    expiresAt: string;
}

export interface AccountStore {
    get(externalUserId: string): StoredAccount | null;
    save(record: StoredAccount): void;
}

export class MemoryAccountStore implements AccountStore {
    private records = new Map<string, StoredAccount>();

    get(externalUserId: string): StoredAccount | null {
        return this.records.get(externalUserId) ?? null;
    }

    save(record: StoredAccount): void {
        this.records.set(record.account.externalUserId, record);
    }
}

/** Encrypt and persist an account's token. */
export function putToken(
    store: AccountStore,
    enc: Encryptor,
    account: ConnectedAccount,
    token: string,
    expiresAt: string,
): void {
    store.save({ account, encryptedToken: enc.encrypt(token), expiresAt });
}

/** Read and decrypt an account's token, or null if unknown. */
export function readToken(store: AccountStore, enc: Encryptor, externalUserId: string): string | null {
    const rec = store.get(externalUserId);
    return rec ? enc.decrypt(rec.encryptedToken) : null;
}
