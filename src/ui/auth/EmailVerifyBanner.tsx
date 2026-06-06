'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { resendVerificationAction, requestTelegramVerifyAction } from '@/actions/auth';

interface Props {
    isTelegramEnabled?: boolean;
}

export const EmailVerifyBanner = ({ isTelegramEnabled = false }: Props) => {
    const { user } = useAuth();
    const alert = useNotification();
    const [sendingEmail, setSendingEmail] = useState(false);
    const [openingTelegram, setOpeningTelegram] = useState(false);

    if (!user || user.isEmailVerified) return null;

    const handleTelegram = async () => {
        setOpeningTelegram(true);
        try {
            const result = await requestTelegramVerifyAction();
            if (result.ok) {
                window.open(result.url, '_blank', 'noopener');
            } else {
                alert('error', result.error);
            }
        } catch {
            alert('error', 'Не удалось открыть Telegram');
        } finally {
            setOpeningTelegram(false);
        }
    };

    const handleResendEmail = async () => {
        setSendingEmail(true);
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
            setSendingEmail(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 bg-amber-500/15 px-4 py-2.5 text-center text-sm text-amber-200">
            <ShieldCheck size={16} className="shrink-0 text-amber-300" />
            <span>Подтвердите аккаунт, чтобы не потерять доступ.</span>
            {isTelegramEnabled && (
                <button
                    onClick={handleTelegram}
                    disabled={openingTelegram}
                    className="cursor-pointer rounded-lg bg-amber-400/90 px-3 py-1 font-semibold text-amber-950 transition hover:bg-amber-300 disabled:cursor-default disabled:opacity-60"
                >
                    {openingTelegram ? 'Открываем…' : 'Подтвердить в Telegram'}
                </button>
            )}
            <button
                onClick={handleResendEmail}
                disabled={sendingEmail}
                className="cursor-pointer rounded-lg border border-amber-300/60 px-3 py-1 font-semibold text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-default disabled:opacity-60"
            >
                {sendingEmail ? 'Отправляем…' : 'Письмо на email'}
            </button>
        </div>
    );
};
