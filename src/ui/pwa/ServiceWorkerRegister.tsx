'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
const SW_URL = `/sw.js?v=${BUILD_ID}`;
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // раз в час

export const ServiceWorkerRegister = () => {
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return;
        if (!('serviceWorker' in navigator)) return;

        let registration: ServiceWorkerRegistration | null = null;

        // Показываем тост, только если уже есть активный воркер (т.е. это апдейт,
        // а не первая установка).
        const offerUpdate = (worker: ServiceWorker | null) => {
            if (worker && navigator.serviceWorker.controller) setWaitingWorker(worker);
        };

        const register = async () => {
            try {
                registration = await navigator.serviceWorker.register(SW_URL, {
                    scope: '/',
                });

                if (registration.waiting) offerUpdate(registration.waiting);

                registration.addEventListener('updatefound', () => {
                    const installing = registration?.installing;
                    if (!installing) return;
                    installing.addEventListener('statechange', () => {
                        if (installing.state === 'installed') {
                            offerUpdate(registration?.waiting ?? installing);
                        }
                    });
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
            document.removeEventListener('visibilitychange', handleVisibility);
            window.clearInterval(interval);
        };
    }, []);

    const applyUpdate = () => {
        if (!waitingWorker) return;
        // После активации нового воркера перезагружаем страницу один раз.
        navigator.serviceWorker.addEventListener(
            'controllerchange',
            () => window.location.reload(),
            { once: true },
        );
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        setWaitingWorker(null);
    };

    if (!waitingWorker) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center p-4">
            <div className="flex items-center gap-3 rounded-xl border border-purple-600/50 bg-purple-900/90 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur">
                <RefreshCw size={16} className="text-pink-400" />
                <span>Доступна новая версия Mesto</span>
                <button
                    onClick={applyUpdate}
                    className="cursor-pointer rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-3 py-1.5 font-semibold text-white transition hover:opacity-95"
                >
                    Обновить
                </button>
            </div>
        </div>
    );
};
