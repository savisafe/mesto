'use client';

import { useEffectiveRole } from '@/hooks/useAccess';

// Показывает содержимое только владельцу бизнеса (или платформенному ADMIN).
// Используется для блоков дашборда, ведущих на owner-only разделы.
export function OwnerOnly({ children }: { children: React.ReactNode }) {
    const { role } = useEffectiveRole();
    const isOwner = role === 'OWNER' || role === 'ADMIN';
    return isOwner ? <>{children}</> : null;
}
