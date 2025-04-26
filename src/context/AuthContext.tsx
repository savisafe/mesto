'use client'

import React, {createContext, useContext, useState, useEffect} from 'react';
import {supabase} from "../../supabaseClient";
import {UserMetadata} from "@supabase/auth-js";

interface AuthContextType {
    accessToken: string | null;
    role: string | null;
    user: UserMetadata | null;
    loading: boolean;
    setAccessToken: (token: string | null) => void;
    businessesData: any[];
    setBusinessesData: (businesses: any[]) => void;
}

const AuthContext = createContext<AuthContextType>({
    accessToken: null,
    role: null,
    user: null,
    loading: true,
    setAccessToken: () => {
    },
    businessesData: [],
    setBusinessesData: () => {
    },
});

export const AuthProvider = ({children}: { children: React.ReactNode }) => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserMetadata | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    //TODO протипизировать any
    const [businessesData, setBusinessesData] = useState<any[]>([]);

    useEffect(() => {
        supabase.auth.getSession().then(({data}) => {
            setAccessToken(data.session?.access_token || null);
            setUser(data.session?.user || null);
            setRole(data.session?.user?.user_metadata?.role || null);
            setLoading(false);
        });
        if(user) {
            supabase
                .from('businesses')
                .select('*')
                .eq('user_id', user?.id).then(({data: businesses}) => {
                setBusinessesData(businesses || []);
            })
        }
    }, []);

    useEffect(() => {
        if(user) {
            supabase
                .from('businesses')
                .select('*')
                .eq('user_id', user?.id).then(({data: businesses}) => {
                setBusinessesData(businesses || []);
            })
        }
    }, [user]);

    return (
        <AuthContext.Provider
            value={{accessToken, setAccessToken, user, loading, role, businessesData, setBusinessesData}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
