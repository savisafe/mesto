'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from "../../supabaseClient";
import { useAuth } from './AuthContext';

interface BusinessContextType {
    businessesData: unknown[];
    setBusinessesData: (businesses: unknown[]) => void;
    currentBusiness: string;
    setCurrentBusiness: (businessId: string) => void;
}

const BusinessContext = createContext<BusinessContextType>({
    businessesData: [],
    setBusinessesData: () => {},
    currentBusiness: '',
    setCurrentBusiness: () => {},
});

export const BusinessProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [businessesData, setBusinessesData] = useState<unknown[]>([]);
    const [currentBusiness, setCurrentBusiness] = useState<string>('');

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
    }, [user]);

    return (
        <BusinessContext.Provider
            value={{
                businessesData,
                setBusinessesData,
                currentBusiness,
                setCurrentBusiness
            }}
        >
            {children}
        </BusinessContext.Provider>
    );
};

export const useBusiness = () => useContext(BusinessContext); 