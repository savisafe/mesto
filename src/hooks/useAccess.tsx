import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes/routes';
import type { UserRole } from '@/db/schema';

interface UseAccessResult {
    status: 'loading' | 'forbidden' | 'ok';
    hasAccess: boolean;
    component: React.ReactNode | null;
}

export const useAccess = (...requiredRoles: UserRole[]): UseAccessResult => {
    const { user, role } = useAuth();
    const router = useRouter();

    const isAllowed = requiredRoles.length === 0 || (role !== null && requiredRoles.includes(role));

    useEffect(() => {
        if (!user) router.replace(routes.LOGIN);
    }, [user, router]);

    if (!user) {
        return { status: 'loading', hasAccess: false, component: null };
    }

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
