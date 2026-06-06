'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNotification } from '@/contexts/NotificationContext';

// Verify-роут (/api/auth/verify/[token]) редиректит на `/?verify=ok|invalid`.
// Здесь показываем уведомление о результате и убираем параметр из URL.
export const VerifyStatusToast = () => {
    const params = useSearchParams();
    const router = useRouter();
    const alert = useNotification();
    const handled = useRef(false);

    useEffect(() => {
        const status = params.get('verify');
        if (!status || handled.current) return;
        handled.current = true;

        if (status === 'ok') {
            alert('success', 'Email подтверждён');
        } else {
            alert('error', 'Ссылка недействительна или истекла');
        }

        router.replace(window.location.pathname);
    }, [params, alert, router]);

    return null;
};
