'use client';

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import {
    listBusinessesAction,
    listArchivedBusinessesAction,
    listMyMembershipsAction,
    createBusinessAction,
    updateBusinessAction,
    archiveBusinessAction,
    unarchiveBusinessAction,
} from '@/actions/businesses';
import type {
    CreateBusinessInput,
    UpdateBusinessInput,
    Membership,
} from '@/services/businesses';
import type { Business } from '@/db/schema';
import { useAuth } from './AuthContext';

interface MutationResult {
    success: boolean;
    error?: string;
}

// Роль пользователя в конкретном бизнесе: владелец или участник.
export type BusinessRole = 'OWNER' | Membership['role'];

interface BusinessContextType {
    businessesData: Business[];
    archivedBusinesses: Business[];
    currentBusiness: string;
    setCurrentBusiness: (id: string) => void;
    // Роль текущего пользователя в выбранном бизнесе (null, пока не вычислена).
    currentRole: BusinessRole | null;
    // true, когда бизнесы и членства загружены и роль можно использовать для гейтинга.
    accessReady: boolean;
    loading: boolean;
    fetchBusinesses: () => Promise<void>;
    fetchArchivedBusinesses: () => Promise<void>;
    createBusiness: (input: CreateBusinessInput) => Promise<MutationResult>;
    updateBusiness: (id: string, input: UpdateBusinessInput) => Promise<MutationResult>;
    archiveBusiness: (id: string) => Promise<MutationResult>;
    unarchiveBusiness: (id: string) => Promise<MutationResult>;
}

// Ключ localStorage для выбранного бизнеса — переживает перезагрузку страницы.
const CURRENT_BUSINESS_KEY = 'mesto:current-business';

const BusinessContext = createContext<BusinessContextType>({
    businessesData: [],
    archivedBusinesses: [],
    currentBusiness: '',
    setCurrentBusiness: () => {},
    currentRole: null,
    accessReady: false,
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
    const [currentBusiness, setCurrentBusinessState] = useState<string>('');
    // null = членства ещё не загружены (роль нельзя использовать для гейтинга).
    const [memberships, setMemberships] = useState<Membership[] | null>(null);
    const [loading, setLoading] = useState(false);

    // Выбор бизнеса вручную: запоминаем в localStorage, чтобы не сбрасывался
    // на первый бизнес при следующем заходе.
    const setCurrentBusiness = useCallback((id: string) => {
        setCurrentBusinessState(id);
        if (typeof window !== 'undefined') {
            localStorage.setItem(CURRENT_BUSINESS_KEY, id);
        }
    }, []);

    const fetchBusinesses = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [bizResult, membersResult] = await Promise.all([
                listBusinessesAction(),
                listMyMembershipsAction(),
            ]);
            if (bizResult.ok) setBusinessesData(bizResult.data);
            // Даже пустой массив членств важен: он переводит accessReady в true.
            setMemberships(membersResult.ok ? membersResult.data : []);
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
            setCurrentBusinessState('');
            setMemberships(null);
        }
    }, [user, fetchBusinesses]);

    // Роль в выбранном бизнесе: владелец определяется по Business.ownerId,
    // участник — по загруженным членствам. Null, пока членства не загружены.
    const currentRole = useMemo<BusinessRole | null>(() => {
        if (!user || !currentBusiness || memberships === null) return null;
        const biz = businessesData.find((b) => b.id === currentBusiness);
        if (biz && biz.ownerId === user.id) return 'OWNER';
        return memberships.find((m) => m.businessId === currentBusiness)?.role ?? null;
    }, [user, currentBusiness, businessesData, memberships]);

    // Гейтинг можно применять, когда членства загружены (роль определена).
    const accessReady = memberships !== null;

    // Пока выбранный бизнес валиден — не трогаем. Иначе восстанавливаем
    // сохранённый выбор (если он ещё в списке), иначе берём первый.
    useEffect(() => {
        if (businessesData.length === 0) return;
        const ids = businessesData.map((b) => b.id);
        if (currentBusiness && ids.includes(currentBusiness)) return;
        const stored =
            typeof window !== 'undefined' ? localStorage.getItem(CURRENT_BUSINESS_KEY) : null;
        setCurrentBusinessState(stored && ids.includes(stored) ? stored : businessesData[0].id);
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
                setCurrentBusiness,
                currentRole,
                accessReady,
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
