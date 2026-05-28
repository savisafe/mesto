import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes/routes';

export const useAccess = (...requiredRoles: string[]) => {
    const { user } = useAuth();
    const router = useRouter();

    const userRole = user?.role ?? '';
    const isAllowed = requiredRoles.length === 0 || requiredRoles.includes(userRole);

    useEffect(() => {
        if (!user) {
            router.replace(routes.LOGIN);
        }
    }, [user, router]);

    if (!user) {
        return { status: 'loading' as const, hasAccess: false, component: null };
    }

    if (!isAllowed) {
        return {
            status: 'forbidden' as const,
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

    return { status: 'ok' as const, hasAccess: true, component: null };
};
