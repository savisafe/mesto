'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, Business, CreateBusinessRequest, UpdateBusinessRequest } from '@/lib/apiClient';
import { useAuth } from './AuthContext';

interface BusinessContextType {
    businessesData: Business[];
    setBusinessesData: (businesses: Business[]) => void;
    currentBusiness: string;
    setCurrentBusiness: (businessId: string) => void;
    loading: boolean;
    error: string | null;
    fetchBusinesses: () => Promise<void>;
    createBusiness: (businessData: CreateBusinessRequest) => Promise<{ success: boolean; error?: string }>;
    updateBusiness: (id: string, businessData: UpdateBusinessRequest) => Promise<{ success: boolean; error?: string }>;
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

export const BusinessProvider = ({ children }: { children: React.ReactNode }) => {
    const { accessToken } = useAuth();
    const [businessesData, setBusinessesData] = useState<Business[]>([]);
    const [currentBusiness, setCurrentBusiness] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Объявляем fetchBusinesses до использования в useEffect
    const fetchBusinesses = useCallback(async () => {
        if (!accessToken) return;

        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.getBusinesses();
            
            if (response.error) {
                setError(response.error);
            } else if (response.data) {
                setBusinessesData(response.data);
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Ошибка загрузки бизнесов');
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    // Загружаем бизнесы при изменении токена
    useEffect(() => {
        if (accessToken) {
            fetchBusinesses();
        } else {
            setBusinessesData([]);
            setCurrentBusiness('');
        }
    }, [accessToken, fetchBusinesses]);

    // Устанавливаем первый бизнес как текущий при загрузке
    useEffect(() => {
        if (businessesData.length > 0 && !currentBusiness) {
            setCurrentBusiness(businessesData[0].id);
        }
    }, [businessesData, currentBusiness]);

    const createBusiness = async (businessData: CreateBusinessRequest) => {
        if (!accessToken) {
            return { success: false, error: 'Необходима авторизация' };
        }

        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.createBusiness(businessData);
            
            if (response.error) {
                setError(response.error);
                return { success: false, error: response.error };
            }

            if (response.data) {
                setBusinessesData(prev => [...prev, response.data!]);
                return { success: true };
            }

            return { success: false, error: 'Неизвестная ошибка' };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка создания бизнеса';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const updateBusiness = async (id: string, businessData: UpdateBusinessRequest) => {
        if (!accessToken) {
            return { success: false, error: 'Необходима авторизация' };
        }

        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.updateBusiness(id, businessData);
            
            if (response.error) {
                setError(response.error);
                return { success: false, error: response.error };
            }

            if (response.data) {
                setBusinessesData(prev => 
                    prev.map(business => 
                        business.id === id ? response.data! : business
                    )
                );
                return { success: true };
            }

            return { success: false, error: 'Неизвестная ошибка' };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка обновления бизнеса';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const deleteBusiness = async (id: string) => {
        if (!accessToken) {
            return { success: false, error: 'Необходима авторизация' };
        }

        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.deleteBusiness(id);
            
            if (response.error) {
                setError(response.error);
                return { success: false, error: response.error };
            }

            setBusinessesData(prev => prev.filter(business => business.id !== id));
            
            // Если удалили текущий бизнес, выбираем следующий
            if (currentBusiness === id) {
                const remainingBusinesses = businessesData.filter(business => business.id !== id);
                setCurrentBusiness(remainingBusinesses.length > 0 ? remainingBusinesses[0].id : '');
            }

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка удаления бизнеса';
            setError(errorMessage);
            return { success: false, error: errorMessage };
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
};

export const useBusiness = () => useContext(BusinessContext);