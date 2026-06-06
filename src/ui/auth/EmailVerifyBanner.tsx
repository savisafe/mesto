'use client';

import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { resendVerificationAction } from '@/actions/auth';

export const EmailVerifyBanner = () => {
    const { user } = useAuth();
    const alert = useNotification();
    const [sending, setSending] = useState(false);

    if (!user || user.isEmailVerified) return null;

    const handleResend = async () => {
        setSending(true);
        try {
            const result = await resendVerificationAction(user.email);
            if (result.ok) {
                alert('success', 'Письмо отправлено — проверьте почту');
            } else {
                alert('error', result.error);
            }
        } catch {
            alert('error', 'Не удалось отправить письмо');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 bg-amber-500/15 px-4 py-2.5 text-center text-sm text-amber-200">
            <MailWarning size={16} className="shrink-0 text-amber-300" />
            <span>
                Подтвердите email <b className="font-semibold">{user.email}</b> — мы отправили
                ссылку на почту.
            </span>
            <button
                onClick={handleResend}
                disabled={sending}
                className="cursor-pointer rounded-lg border border-amber-300/60 px-3 py-1 font-semibold text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-default disabled:opacity-60"
            >
                {sending ? 'Отправляем…' : 'Отправить снова'}
            </button>
        </div>
    );
};
