// src/hooks/useProtectedRoute.tsx
'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/context/AuthContext';
import {Role} from "@/types/types";

export function useProtectedRoute(requiredRole: Role) {
    const {accessToken, role} = useAuth();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (!accessToken) {
            router.replace('/');
        } else if (role !== requiredRole) {
            router.replace('/');
        } else {
            setAuthorized(true);
        }
    }, [accessToken, role]);

    if (!authorized) {
        return (
            <div className="w-full min-h-[300px] flex items-center justify-center text-white">
                Загрузка...
            </div>
        );
    }

    return null;
}
