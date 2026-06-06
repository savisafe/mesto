'use client';

import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePwaInstallResult {
    canInstall: boolean;
    promptInstall: () => Promise<void>;
}

export const usePwaInstall = (): UsePwaInstallResult => {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        const handlePrompt = (event: Event) => {
            // Перехватываем дефолтный баннер, чтобы показать свою кнопку.
            event.preventDefault();
            setDeferred(event as BeforeInstallPromptEvent);
        };
        const handleInstalled = () => setDeferred(null);

        window.addEventListener('beforeinstallprompt', handlePrompt);
        window.addEventListener('appinstalled', handleInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', handlePrompt);
            window.removeEventListener('appinstalled', handleInstalled);
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

    return { canInstall: deferred !== null, promptInstall };
};
