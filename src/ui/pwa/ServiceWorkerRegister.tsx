'use client';

import { useEffect } from 'react';

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
const SW_URL = `/sw.js?v=${BUILD_ID}`;
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // раз в час

// В dev унаследованный воркер (например, после локального прод-билда на том же
// localhost) продолжает отдавать устаревшие чанки через stale-while-revalidate,
// поэтому изменений кода не видно. Просто не регистрировать новый воркер мало —
// надо снести уже установленный и его кэши.
const cleanupServiceWorkerInDev = async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
    }

    // unregister() не освобождает текущую страницу — ею до перезагрузки управляет
    // снесённый воркер. Перезагружаемся один раз (флаг страхует от цикла).
    const RELOAD_FLAG = 'sw-dev-cleaned';
    if (navigator.serviceWorker.controller && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
    }
};

export const ServiceWorkerRegister = () => {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        if (process.env.NODE_ENV !== 'production') {
            void cleanupServiceWorkerInDev();
            return;
        }

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
