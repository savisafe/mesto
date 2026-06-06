'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Popup } from '@/ui/popup/Popup';
import { TextField } from '@/ui/form';
import { Button } from '@/ui/button/Button';
import { useNotification } from '@/contexts/NotificationContext';
import { requestMagicLinkAction } from '@/actions/auth';
import { routes } from '@/routes/routes';

const RESEND_COOLDOWN_SEC = 60;

export default function LoginOTPPage() {
    const alert = useNotification();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleLoginOTP = async (e: FormEvent) => {
        e.preventDefault();

        if (!email) {
            setError('Введите email');
            return;
        }

        setLoading(true);
        setError(undefined);
        try {
            const result = await requestMagicLinkAction(email);
            if (result.ok) {
                setSent(true);
                setCooldown(RESEND_COOLDOWN_SEC);
                alert('success', 'Если такой email зарегистрирован — ссылка отправлена');
            } else {
                setError(result.error);
            }
        } catch {
            setError('Произошла ошибка при отправке ссылки');
        } finally {
            setLoading(false);
        }
    };

    const buttonLabel =
        cooldown > 0 ? `Повторить через ${cooldown} с` : 'Отправить ссылку входа';

    return (
        <Popup title="Быстрый вход">
            <form onSubmit={handleLoginOTP}>
                <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={setEmail}
                    error={error}
                    hint={sent ? 'Проверьте почту — мы отправили ссылку для входа' : undefined}
                />

                <div className="flex justify-center mt-4">
                    <Button type="submit" loading={loading} disabled={cooldown > 0}>
                        {buttonLabel}
                    </Button>
                </div>
            </form>

            <div className="flex justify-between items-center mt-4 text-sm text-purple-400">
                <Link href={routes.LOGIN} className="underline hover:text-purple-300">
                    Вход
                </Link>
                <Link href={routes.REGISTRATION} className="underline hover:text-purple-300">
                    Регистрация
                </Link>
            </div>
        </Popup>
    );
}
