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
    businessesData: unknown[];
    setBusinessesData: (businesses: unknown[]) => void;
    setCurrentBusinesses: (businesses: unknown[]) => void;
    currentBusiness: string;
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
    setCurrentBusinesses: () => {},
    currentBusiness: ''
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const defaultName = 'Пользователь';
    const pathname = usePathname();
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserMetadata | null>(null);
    const [userName, setUserName] = useState(defaultName);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [businessesData, setBusinessesData] = useState<unknown[]>([]);
    const [currentBusiness, setCurrentBusiness] = useState<string>('');

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
                setBusinessesData([]);
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
                    if (businesses && businesses.length > 0) {
                        setCurrentBusiness(businesses[0].id);
                    }
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
                setCurrentBusinesses: () => {},
                currentBusiness
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
