'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    listBusinessesAction,
    listArchivedBusinessesAction,
    createBusinessAction,
    updateBusinessAction,
    archiveBusinessAction,
    unarchiveBusinessAction,
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
    archivedBusinesses: Business[];
    currentBusiness: string;
    loading: boolean;
    fetchBusinesses: () => Promise<void>;
    fetchArchivedBusinesses: () => Promise<void>;
    createBusiness: (input: CreateBusinessInput) => Promise<MutationResult>;
    updateBusiness: (id: string, input: UpdateBusinessInput) => Promise<MutationResult>;
    archiveBusiness: (id: string) => Promise<MutationResult>;
    unarchiveBusiness: (id: string) => Promise<MutationResult>;
}

const BusinessContext = createContext<BusinessContextType>({
    businessesData: [],
    archivedBusinesses: [],
    currentBusiness: '',
    loading: false,
    fetchBusinesses: async () => {},
    fetchArchivedBusinesses: async () => {},
    createBusiness: async () => ({ success: false }),
    updateBusiness: async () => ({ success: false }),
    archiveBusiness: async () => ({ success: false }),
    unarchiveBusiness: async () => ({ success: false }),
});

export function BusinessProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [businessesData, setBusinessesData] = useState<Business[]>([]);
    const [archivedBusinesses, setArchivedBusinesses] = useState<Business[]>([]);
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

    const fetchArchivedBusinesses = useCallback(async () => {
        if (!user) return;
        const result = await listArchivedBusinessesAction();
        if (result.ok) setArchivedBusinesses(result.data);
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchBusinesses();
        } else {
            setBusinessesData([]);
            setArchivedBusinesses([]);
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

    const archiveBusiness = async (id: string): Promise<MutationResult> => {
        setLoading(true);
        try {
            const result = await archiveBusinessAction(id);
            if (!result.ok) return { success: false, error: result.error };
            setBusinessesData((prev) => prev.filter((b) => b.id !== id));
            setArchivedBusinesses((prev) => [result.data, ...prev]);
            if (currentBusiness === id) {
                const remaining = businessesData.filter((b) => b.id !== id);
                setCurrentBusiness(remaining.length > 0 ? remaining[0].id : '');
            }
            return { success: true };
        } finally {
            setLoading(false);
        }
    };

    const unarchiveBusiness = async (id: string): Promise<MutationResult> => {
        setLoading(true);
        try {
            const result = await unarchiveBusinessAction(id);
            if (!result.ok) return { success: false, error: result.error };
            setArchivedBusinesses((prev) => prev.filter((b) => b.id !== id));
            setBusinessesData((prev) => [...prev, result.data]);
            return { success: true };
        } finally {
            setLoading(false);
        }
    };

    return (
        <BusinessContext.Provider
            value={{
                businessesData,
                archivedBusinesses,
                currentBusiness,
                loading,
                fetchBusinesses,
                fetchArchivedBusinesses,
                createBusiness,
                updateBusiness,
                archiveBusiness,
                unarchiveBusiness,
            }}
        >
            {children}
        </BusinessContext.Provider>
    );
}

export const useBusiness = () => useContext(BusinessContext);
