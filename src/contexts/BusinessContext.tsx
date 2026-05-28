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

interface BusinessContextType {
    businessesData: Business[];
    setBusinessesData: (businesses: Business[]) => void;
    currentBusiness: string;
    setCurrentBusiness: (businessId: string) => void;
    loading: boolean;
    error: string | null;
    fetchBusinesses: () => Promise<void>;
    createBusiness: (input: CreateBusinessInput) => Promise<{ success: boolean; error?: string }>;
    updateBusiness: (
        id: string,
        input: UpdateBusinessInput,
    ) => Promise<{ success: boolean; error?: string }>;
    deleteBusiness: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const BusinessContext = createContext<BusinessContextType>({
    businessesData: [],
    setBusinessesData: () => {},
    currentBusiness: '',
    setCurrentBusiness: () => {},
    loading: false,
    error: null,
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
    const [error, setError] = useState<string | null>(null);

    const fetchBusinesses = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const result = await listBusinessesAction();
            if (!result.ok) {
                setError(result.error);
            } else {
                setBusinessesData(result.data);
            }
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

    const createBusiness = async (input: CreateBusinessInput) => {
        setLoading(true);
        setError(null);
        try {
            const result = await createBusinessAction(input);
            if (!result.ok) {
                setError(result.error);
                return { success: false, error: result.error };
            }
            setBusinessesData((prev) => [...prev, result.data]);
            return { success: true };
        } finally {
            setLoading(false);
        }
    };

    const updateBusiness = async (id: string, input: UpdateBusinessInput) => {
        setLoading(true);
        setError(null);
        try {
            const result = await updateBusinessAction(id, input);
            if (!result.ok) {
                setError(result.error);
                return { success: false, error: result.error };
            }
            setBusinessesData((prev) =>
                prev.map((b) => (b.id === id ? result.data : b)),
            );
            return { success: true };
        } finally {
            setLoading(false);
        }
    };

    const deleteBusiness = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await deleteBusinessAction(id);
            if (!result.ok) {
                setError(result.error);
                return { success: false, error: result.error };
            }
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
                setBusinessesData,
                currentBusiness,
                setCurrentBusiness,
                loading,
                error,
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
