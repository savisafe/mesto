import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { routes } from '@/routes/routes';
import type { UserRole } from '@/db/schema';

interface UseAccessResult {
    status: 'loading' | 'forbidden' | 'ok';
    hasAccess: boolean;
    component: React.ReactNode | null;
}

// Эффективная роль для гейтинга: глобальный ADMIN видит всё; иначе берём роль
// в выбранном бизнесе. Если бизнес не выбран (пользователь ещё без бизнеса) —
// откатываемся на глобальную роль, чтобы будущий владелец мог создать бизнес.
// `ready` = false, пока членства не загружены: до этого роль использовать нельзя.
export const useEffectiveRole = (): { role: UserRole | null; ready: boolean } => {
    const { role: globalRole } = useAuth();
    const { currentRole, accessReady } = useBusiness();

    if (globalRole === 'ADMIN') return { role: 'ADMIN', ready: true };
    if (!accessReady) return { role: null, ready: false };
    return { role: currentRole ?? globalRole, ready: true };
};

// Гейтинг страницы. Без аргументов — только проверка авторизации.
// С ролями — доступ по роли в текущем бизнесе (см. useEffectiveRole).
export const useAccess = (...requiredRoles: UserRole[]): UseAccessResult => {
    const { user } = useAuth();
    const { role: effectiveRole, ready } = useEffectiveRole();
    const router = useRouter();

    useEffect(() => {
        if (!user) router.replace(routes.LOGIN);
    }, [user, router]);

    if (!user) {
        return { status: 'loading', hasAccess: false, component: null };
    }

    if (requiredRoles.length === 0) {
        return { status: 'ok', hasAccess: true, component: null };
    }

    // Роль ещё не определена — показываем «загрузку», а не «запрещено».
    if (!ready) {
        return { status: 'loading', hasAccess: false, component: null };
    }

    const isAllowed = effectiveRole !== null && requiredRoles.includes(effectiveRole);
    if (!isAllowed) {
        return {
            status: 'forbidden',
            hasAccess: false,
            component: (
                <div className="flex flex-col items-center justify-center h-screen">
                    <h1 className="text-3xl font-bold mb-4">Доступ запрещён</h1>
                    <p className="text-lg text-gray-700 mb-6">
                        У вас нет прав доступа к этой странице.
                    </p>
                </div>
            ),
        };
    }

    return { status: 'ok', hasAccess: true, component: null };
};
