'use client';

import { useEffect } from 'react';

export const ServiceWorkerRegister = () => {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return;
        if (!('serviceWorker' in navigator)) return;

        const register = async () => {
            try {
                await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            } catch (error) {
                console.error('Не удалось зарегистрировать service worker:', error);
            }
        };

        register();
    }, []);

    return null;
};
