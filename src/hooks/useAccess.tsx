import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Spinner from "@/ui/spinner/Spinner";
import { routes } from "@/routes/routes";

export const useAccess = (...requiredRoles: string[]) => {
    const { accessToken, user, loading } = useAuth();
    const router = useRouter();

    const userRole = user?.user_metadata?.role ?? '';

    const isAllowed = requiredRoles.length === 0 || requiredRoles.includes(userRole);

    useEffect(() => {
        if (!loading && accessToken === null) {
            router.replace(routes.HOME);
        }
    }, [accessToken, loading, router]);

    if (loading || accessToken === null || !userRole) {
        return { status: 'loading', component: <Spinner /> };
    }

    if (!isAllowed) {
        return {
            status: 'forbidden',
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

    return { status: 'ok' };
};
