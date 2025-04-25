'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface Notification {
    type: 'success' | 'error' | 'info';
    message: string;
}

const NotificationContext = createContext<(type: Notification['type'], message: string) => void>(() => {});

export const useNotification = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notification, setNotification] = useState<Notification | null>(null);

    const alert = (type: Notification['type'], message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    return (
        <NotificationContext.Provider value={alert}>
            {children}
            {notification && (
                <div className="fixed bottom-6 right-6 z-50">
                    <div className={`
                        px-4 py-3 rounded-xl shadow-lg transition-all animate-fade-in
                        ${notification.type === 'success' && 'bg-green-600'}
                        ${notification.type === 'error' && 'bg-red-600'}
                        ${notification.type === 'info' && 'bg-purple-700'}
                        text-white text-sm
                    `}>
                        {notification.message}
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
}
