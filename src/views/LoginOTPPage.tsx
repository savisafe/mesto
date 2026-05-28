'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Popup } from '@/ui/popup/Popup';
import { Input } from '@/ui/input/Input';
import { Button } from '@/ui/button/Button';
import { useNotification } from '@/contexts/NotificationContext';
import { requestMagicLinkAction } from '@/actions/auth';
import { routes } from '@/routes/routes';

export default function LoginOTPPage() {
    const alert = useNotification();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleLoginOTP = async () => {
        if (!email) {
            setError('Введите email');
            return;
        }

        setLoading(true);
        setError(null);
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
        <Popup title={'Вход через email'}>
            <Input
                type="email"
                placeholder="Введите ваш email"
                value={email}
                setValue={setEmail}
                transitionDelay={0.35}
            />

            {error && (
                <motion.p
                    className="text-red-400 text-sm mb-4 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                >
                    {error}
                </motion.p>
            )}

            {sent && (
                <motion.p
                    className="text-green-400 text-sm mb-4 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    Проверьте почту — мы отправили ссылку для входа.
                </motion.p>
            )}

            <div className="flex justify-center mt-4">
                <Button
                    onClick={handleLoginOTP}
                    loading={loading}
                    transitionDelay={0.5}
                >
                    {loading ? 'Отправляем...' : 'Отправить ссылку входа'}
                </Button>
            </div>

            <motion.div
                className="flex justify-between items-center mt-4 text-sm text-purple-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
            >
                <a href={routes.LOGIN} className="underline hover:text-purple-300">
                    Вход
                </a>
                <a href={routes.REGISTRATION} className="underline hover:text-purple-300">
                    Регистрация
                </a>
            </motion.div>
        </Popup>
    );
}
