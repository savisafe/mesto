'use client';

import { useEffect } from 'react';

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
const SW_URL = `/sw.js?v=${BUILD_ID}`;
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // раз в час

export const ServiceWorkerRegister = () => {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return;
        if (!('serviceWorker' in navigator)) return;

        let registration: ServiceWorkerRegistration | null = null;

        // Новый воркер активируется сразу (skipWaiting в sw.js) и забирает
        // управление → controllerchange. Перезагружаем страницу один раз, чтобы
        // клиент гарантированно работал на актуальном билде (нет deployment skew).
        // На самой первой установке controller ещё не было — перезагрузка не нужна.
        const hadController = Boolean(navigator.serviceWorker.controller);
        let refreshing = false;
        const handleControllerChange = () => {
            if (!hadController || refreshing) return;
            refreshing = true;
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        const register = async () => {
            try {
                registration = await navigator.serviceWorker.register(SW_URL, {
                    scope: '/',
                });
            } catch (error) {
                console.error('Не удалось зарегистрировать service worker:', error);
            }
        };

        register();

        // Проверяем обновление при возврате в приложение (важно для iOS, где PWA
        // «оживает» из фона без полной перезагрузки) и периодически.
        const checkForUpdate = () => registration?.update().catch(() => {});
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') checkForUpdate();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        const interval = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);

        return () => {
            navigator.serviceWorker.removeEventListener(
                'controllerchange',
                handleControllerChange,
            );
            document.removeEventListener('visibilitychange', handleVisibility);
            window.clearInterval(interval);
        };
    }, []);

    return null;
};
