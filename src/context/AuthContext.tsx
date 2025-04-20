'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import {supabase} from "../../supabaseClient";

interface AuthContextType {
    accessToken: string | null;
    setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
    accessToken: null,
    setAccessToken: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [accessToken, setAccessToken] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setAccessToken(data.session?.access_token || null);
        });
    }, []);

    return (
        <AuthContext.Provider value={{ accessToken, setAccessToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
