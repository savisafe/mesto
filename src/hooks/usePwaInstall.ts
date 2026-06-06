'use client';

import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePwaInstallResult {
    /** Браузер дал нативный промпт установки (Chrome/Edge/Android). */
    canPrompt: boolean;
    /** Приложение уже запущено как установленное PWA. */
    isStandalone: boolean;
    /** iOS/iPadOS — установка только вручную через «Поделиться». */
    isIOS: boolean;
    promptInstall: () => Promise<void>;
}

const detectIOS = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isIPhone = /iphone|ipad|ipod/i.test(ua);
    // iPadOS 13+ маскируется под macOS — ловим по сенсорному экрану.
    const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return isIPhone || isIPadOS;
};

const detectStandalone = (): boolean => {
    if (typeof window === 'undefined') return false;
    const navStandalone = (window.navigator as Navigator & { standalone?: boolean })
        .standalone;
    return (
        window.matchMedia('(display-mode: standalone)').matches || navStandalone === true
    );
};

export const usePwaInstall = (): UsePwaInstallResult => {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        setIsIOS(detectIOS());
        setIsStandalone(detectStandalone());

        const handlePrompt = (event: Event) => {
            // Перехватываем дефолтный баннер, чтобы показать свою кнопку.
            event.preventDefault();
            setDeferred(event as BeforeInstallPromptEvent);
        };
        const handleInstalled = () => {
            setDeferred(null);
            setIsStandalone(true);
        };
        const displayQuery = window.matchMedia('(display-mode: standalone)');
        const handleDisplayChange = (event: MediaQueryListEvent) =>
            setIsStandalone(event.matches);

        window.addEventListener('beforeinstallprompt', handlePrompt);
        window.addEventListener('appinstalled', handleInstalled);
        displayQuery.addEventListener('change', handleDisplayChange);
        return () => {
            window.removeEventListener('beforeinstallprompt', handlePrompt);
            window.removeEventListener('appinstalled', handleInstalled);
            displayQuery.removeEventListener('change', handleDisplayChange);
        };
    }, []);

    const promptInstall = useCallback(async () => {
        if (!deferred) return;
        try {
            await deferred.prompt();
            await deferred.userChoice;
        } catch (error) {
            console.error('Ошибка установки PWA:', error);
        } finally {
            // Событие одноразовое — повторно использовать нельзя.
            setDeferred(null);
        }
    }, [deferred]);

    return { canPrompt: deferred !== null, isStandalone, isIOS, promptInstall };
};
