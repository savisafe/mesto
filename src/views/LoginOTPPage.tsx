'use client';

import { useState } from 'react';
import { Popup } from '@/ui/popup/Popup';
import { TextField } from '@/ui/form';
import { Button } from '@/ui/button/Button';
import { useNotification } from '@/contexts/NotificationContext';
import { requestMagicLinkAction } from '@/actions/auth';
import { routes } from '@/routes/routes';

export default function LoginOTPPage() {
    const alert = useNotification();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleLoginOTP = async () => {
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

    return (
        <Popup title="Вход через email">
            <TextField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                error={error}
                hint={sent ? 'Проверьте почту — мы отправили ссылку для входа' : undefined}
            />

            <div className="flex justify-center mt-4">
                <Button onClick={handleLoginOTP} loading={loading}>
                    {loading ? 'Отправляем...' : 'Отправить ссылку входа'}
                </Button>
            </div>

            <div className="flex justify-between items-center mt-4 text-sm text-purple-400">
                <a href={routes.LOGIN} className="underline hover:text-purple-300">
                    Вход
                </a>
                <a href={routes.REGISTRATION} className="underline hover:text-purple-300">
                    Регистрация
                </a>
            </div>
        </Popup>
    );
}
