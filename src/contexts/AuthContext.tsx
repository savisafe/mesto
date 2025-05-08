'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import { UserMetadata } from "@supabase/auth-js";

interface AuthContextType {
    accessToken: string | null;
    userName: string | null;
    role: string | null;
    user: UserMetadata | null;
    setUser: (user: UserMetadata | null) => void;
    loading: boolean;
    setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
    accessToken: null,
    userName: '',
    role: null,
    user: null,
    setUser: () => {},
    loading: true,
    setAccessToken: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const defaultName = 'Пользователь';
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserMetadata | null>(null);
    const [userName, setUserName] = useState(defaultName);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initSession = async () => {
            const { data } = await supabase.auth.getSession();
            const session = data.session;

            if (session) {
                setAccessToken(session.access_token);
                setUser(session.user || null);
                setUserName(session.user?.user_metadata?.name || defaultName);
                setRole(session.user?.user_metadata?.role || null);
            } else {
                setAccessToken(null);
                setUser(null);
                setUserName(defaultName);
                setRole(null);
            }
            setLoading(false);
        };

        initSession();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.access_token) {
                setAccessToken(session.access_token);
                setUser(session.user || null);
                setUserName(session.user?.user_metadata?.name || defaultName);
                setRole(session.user?.user_metadata?.role || null);
            } else {
                setAccessToken(null);
                setUser(null);
                setUserName(defaultName);
                setRole(null);
            }
        });

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider
            value={{
                accessToken,
                setAccessToken,
                user,
                setUser,
                loading,
                role,
                userName
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
