'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import { UserMetadata } from "@supabase/auth-js";
import { usePathname } from "next/navigation";

interface AuthContextType {
    accessToken: string | null;
    userName: string | null;
    role: string | null;
    user: UserMetadata | null;
    setUser: (user: UserMetadata | null) => void;
    loading: boolean;
    setAccessToken: (token: string | null) => void;
    businessesData: any[];
    setBusinessesData: (businesses: any[]) => void;
}

const AuthContext = createContext<AuthContextType>({
    accessToken: null,
    userName: '',
    role: null,
    user: null,
    setUser: () => {},
    loading: true,
    setAccessToken: () => {},
    businessesData: [],
    setBusinessesData: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserMetadata | null>(null);
    const [userName, setUserName] = useState('Пользователь');
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [businessesData, setBusinessesData] = useState<any[]>([]);

    useEffect(() => {
        const initSession = async () => {
            const { data } = await supabase.auth.getSession();
            const session = data.session;

            if (session) {
                setAccessToken(session.access_token);
                setUser(session.user || null);
                setUserName(session.user?.user_metadata?.name || 'Пользователь');
                setRole(session.user?.user_metadata?.role || null);
            } else {
                setAccessToken(null);
                setUser(null);
                setUserName('Пользователь');
                setRole(null);
                setBusinessesData([]);
            }
            setLoading(false);
        };

        initSession();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.access_token) {
                setAccessToken(session.access_token);
                setUser(session.user || null);
                setUserName(session.user?.user_metadata?.name || 'Пользователь');
                setRole(session.user?.user_metadata?.role || null);
            } else {
                // Пользователь вышел
                setAccessToken(null);
                setUser(null);
                setUserName('Пользователь');
                setRole(null);
                setBusinessesData([]);
            }
        });

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (user) {
            supabase
                .from('businesses')
                .select('*')
                .eq('user_id', user.id)
                .then(({ data: businesses }) => {
                    setBusinessesData(businesses || []);
                });
        }
    }, [user, pathname]);

    return (
        <AuthContext.Provider
            value={{
                accessToken,
                setAccessToken,
                user,
                setUser,
                loading,
                role,
                businessesData,
                setBusinessesData,
                userName,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
