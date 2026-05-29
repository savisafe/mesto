'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    listBusinessesAction,
    createBusinessAction,
    updateBusinessAction,
    deleteBusinessAction,
} from '@/actions/businesses';
import type { CreateBusinessInput, UpdateBusinessInput } from '@/services/businesses';
import type { Business } from '@/db/schema';
import { useAuth } from './AuthContext';

interface MutationResult {
    success: boolean;
    error?: string;
}

interface BusinessContextType {
    businessesData: Business[];
    currentBusiness: string;
    loading: boolean;
    fetchBusinesses: () => Promise<void>;
    createBusiness: (input: CreateBusinessInput) => Promise<MutationResult>;
    updateBusiness: (id: string, input: UpdateBusinessInput) => Promise<MutationResult>;
    deleteBusiness: (id: string) => Promise<MutationResult>;
}

const BusinessContext = createContext<BusinessContextType>({
    businessesData: [],
    currentBusiness: '',
    loading: false,
    fetchBusinesses: async () => {},
    createBusiness: async () => ({ success: false }),
    updateBusiness: async () => ({ success: false }),
    deleteBusiness: async () => ({ success: false }),
});

export function BusinessProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [businessesData, setBusinessesData] = useState<Business[]>([]);
    const [currentBusiness, setCurrentBusiness] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const fetchBusinesses = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const result = await listBusinessesAction();
            if (result.ok) setBusinessesData(result.data);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchBusinesses();
        } else {
            setBusinessesData([]);
            setCurrentBusiness('');
        }
    }, [user, fetchBusinesses]);

    useEffect(() => {
        if (businessesData.length > 0 && !currentBusiness) {
            setCurrentBusiness(businessesData[0].id);
        }
    }, [businessesData, currentBusiness]);

    const createBusiness = async (input: CreateBusinessInput): Promise<MutationResult> => {
        setLoading(true);
        try {
            const result = await createBusinessAction(input);
            if (!result.ok) return { success: false, error: result.error };
            setBusinessesData((prev) => [...prev, result.data]);
            return { success: true };
        } finally {
            setLoading(false);
        }
    };

    const updateBusiness = async (
        id: string,
        input: UpdateBusinessInput,
    ): Promise<MutationResult> => {
        setLoading(true);
        try {
            const result = await updateBusinessAction(id, input);
            if (!result.ok) return { success: false, error: result.error };
            setBusinessesData((prev) => prev.map((b) => (b.id === id ? result.data : b)));
            return { success: true };
        } finally {
            setLoading(false);
        }
    };

    const deleteBusiness = async (id: string): Promise<MutationResult> => {
        setLoading(true);
        try {
            const result = await deleteBusinessAction(id);
            if (!result.ok) return { success: false, error: result.error };
            setBusinessesData((prev) => prev.filter((b) => b.id !== id));
            if (currentBusiness === id) {
                const remaining = businessesData.filter((b) => b.id !== id);
                setCurrentBusiness(remaining.length > 0 ? remaining[0].id : '');
            }
            return { success: true };
        } finally {
            setLoading(false);
        }
    };

    return (
        <BusinessContext.Provider
            value={{
                businessesData,
                currentBusiness,
                loading,
                fetchBusinesses,
                createBusiness,
                updateBusiness,
                deleteBusiness,
            }}
        >
            {children}
        </BusinessContext.Provider>
    );
}

export const useBusiness = () => useContext(BusinessContext);
