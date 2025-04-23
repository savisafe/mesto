'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import {supabase} from "../../supabaseClient";
import {UserMetadata} from "@supabase/auth-js";

interface AuthContextType {
    accessToken: string | null;
    user: UserMetadata | null;
    setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
    accessToken: null,
    user: null,
    setAccessToken: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserMetadata | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setAccessToken(data.session?.access_token || null);
            setUser(data.session?.user?.user_metadata || null);
        });
    }, []);

    return (
        <AuthContext.Provider value={{ accessToken, setAccessToken, user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
