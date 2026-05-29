'use client';

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect,
    type ReactNode,
} from 'react';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
    type: NotificationType;
    message: string;
}

type Alert = (type: NotificationType, message: string) => void;

const NOTIFICATION_TTL_MS = 3000;

const NotificationContext = createContext<Alert>(() => {});

export const useNotification = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notification, setNotification] = useState<Notification | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // Стабильная ссылка — чтобы консьюмеры не зацикливались, если положат alert в deps useEffect.
    const alert = useCallback<Alert>((type, message) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setNotification({ type, message });
        timerRef.current = setTimeout(() => {
            setNotification(null);
            timerRef.current = null;
        }, NOTIFICATION_TTL_MS);
    }, []);

    const bgClass =
        notification?.type === 'success'
            ? 'bg-green-600'
            : notification?.type === 'error'
              ? 'bg-red-600'
              : 'bg-purple-700';

    return (
        <NotificationContext.Provider value={alert}>
            {children}
            {notification && (
                <div className="fixed bottom-6 right-6 z-50">
                    <div
                        className={`px-4 py-3 rounded-xl shadow-lg transition-all animate-fade-in text-white text-sm ${bgClass}`}
                    >
                        {notification.message}
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
}
