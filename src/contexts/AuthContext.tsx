'use client';

import React, { createContext, useContext, useState } from 'react';
import type { PublicUser } from '@/db/schema';
import { logoutAction } from '@/actions/auth';

const DEFAULT_NAME = 'Пользователь';

interface AuthContextType {
    user: PublicUser | null;
    setUser: (user: PublicUser | null) => void;
    userName: string;
    role: string | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    setUser: () => {},
    userName: DEFAULT_NAME,
    role: null,
    loading: false,
    logout: async () => {},
});

interface AuthProviderProps {
    initialUser: PublicUser | null;
    children: React.ReactNode;
}

export function AuthProvider({ initialUser, children }: AuthProviderProps) {
    const [user, setUser] = useState<PublicUser | null>(initialUser);

    const logout = async () => {
        setUser(null);
        await logoutAction();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                userName: user?.name ?? DEFAULT_NAME,
                role: user?.role ?? null,
                loading: false,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
