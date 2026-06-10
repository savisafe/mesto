import type { AccountStore } from './accounts';
import type { Encryptor } from './crypto';

export interface RefreshDeps {
    accountStore: AccountStore;
    encryptor: Encryptor;
    /** Provider-specific token refresh (e.g. InstagramProvider.refresh). */
    refresh: (token: string) => Promise<{ accessToken: string; expiresAt: string }>;
    /** Refresh tokens expiring within this window. Default 7 days. */
    withinMs?: number;
    now?: () => number;
}

export interface RefreshReport {
    refreshed: string[];
    failed: { externalUserId: string; error: string }[];
}

/**
 * Cron entry point: refresh long-lived tokens that are close to expiry. Idempotent
 * and resilient — one account failing does not abort the rest.
 */
export async function refreshDueTokens(deps: RefreshDeps): Promise<RefreshReport> {
    const within = deps.withinMs ?? 7 * 24 * 60 * 60 * 1000;
    const now = deps.now?.() ?? Date.now();
    const report: RefreshReport = { refreshed: [], failed: [] };

    for (const rec of deps.accountStore.all()) {
        const remaining = new Date(rec.expiresAt).getTime() - now;
        if (Number.isFinite(remaining) && remaining > within) continue;

        try {
            const token = deps.encryptor.decrypt(rec.encryptedToken);
            const next = await deps.refresh(token);
            deps.accountStore.save({
                account: rec.account,
                encryptedToken: deps.encryptor.encrypt(next.accessToken),
                expiresAt: next.expiresAt,
            });
            report.refreshed.push(rec.account.externalUserId);
        } catch (err) {
            report.failed.push({
                externalUserId: rec.account.externalUserId,
                error: err instanceof Error ? err.message : 'unknown',
            });
        }
    }

    return report;
}
