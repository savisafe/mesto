'use client';

import React, { createContext, useContext } from 'react';
import type { PublicUser, UserRole } from '@/db/schema';
import { logoutAction } from '@/actions/auth';

const DEFAULT_NAME = 'Пользователь';

interface AuthContextType {
    user: PublicUser | null;
    userName: string;
    role: UserRole | null;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userName: DEFAULT_NAME,
    role: null,
    logout: async () => {},
});

interface AuthProviderProps {
    initialUser: PublicUser | null;
    children: React.ReactNode;
}

// Источник истины — server layout. После logoutAction делается redirect,
// layout перерендеривается, новый initialUser приходит сюда пропсом —
// поэтому никакого внутреннего setUser/useState не нужно.
export function AuthProvider({ initialUser, children }: AuthProviderProps) {
    return (
        <AuthContext.Provider
            value={{
                user: initialUser,
                userName: initialUser?.name ?? DEFAULT_NAME,
                role: initialUser?.role ?? null,
                logout: logoutAction,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
