'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { TextField, PasswordField } from '@/ui/form';
import { Button } from '@/ui/button/Button';
import { Popup } from '@/ui/popup/Popup';
import { useNotification } from '@/contexts/NotificationContext';
import { loginAction } from '@/actions/auth';
import { routes, authPathWithParams } from '@/routes/routes';

export default function LoginPage() {
    const alert = useNotification();
    const searchParams = useSearchParams();
    const next = searchParams?.get('next') ?? undefined;
    const invitedEmail = searchParams?.get('email') ?? '';
    const [email, setEmail] = useState(invitedEmail);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            alert('error', 'Заполните все поля');
            return;
        }

        setLoading(true);
        try {
            const result = await loginAction({ email, password }, next);
            if (!result.ok) alert('error', result.error);
        } catch (err) {
            // redirect() из next/navigation бросает специальный объект — не считаем ошибкой
            const message = err instanceof Error ? err.message : '';
            if (!message.includes('NEXT_REDIRECT')) {
                alert('error', 'Произошла ошибка при входе');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popup title="Вход в систему">
            <form onSubmit={handleLogin}>
                <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={setEmail}
                />
                <PasswordField
                    label="Пароль"
                    autoComplete="current-password"
                    value={password}
                    onChange={setPassword}
                />

                <div className="flex justify-center mt-4">
                    <Button type="submit" loading={loading}>
                        Войти в систему
                    </Button>
                </div>
            </form>

            <motion.div
                className="flex justify-between items-center mt-4 text-sm text-purple-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                <Link href={routes.LOGIN_OTP} className="underline hover:text-purple-300">
                    Быстрый вход
                </Link>
                <Link
                    href={authPathWithParams(routes.REGISTRATION, { next, email: invitedEmail })}
                    className="underline hover:text-purple-300"
                >
                    Регистрация
                </Link>
            </motion.div>
        </Popup>
    );
}
