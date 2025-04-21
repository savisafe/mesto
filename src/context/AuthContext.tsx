'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import {supabase} from "../../supabaseClient";

interface AuthContextType {
    accessToken: string | null;
    role: string | null;
    setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
    accessToken: null,
    role: null,
    setAccessToken: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setAccessToken(data.session?.access_token || null);
            setRole(data.session?.user?.user_metadata.role || null);
        });
    }, []);

    return (
        <AuthContext.Provider value={{ accessToken, setAccessToken, role }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
