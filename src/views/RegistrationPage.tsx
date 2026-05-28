'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/ui/button/Button';
import { Input } from '@/ui/input/Input';
import { Popup } from '@/ui/popup/Popup';
import { useNotification } from '@/contexts/NotificationContext';
import { registerAction } from '@/actions/auth';
import { routes } from '@/routes/routes';

export default function RegistrationPage() {
    const alert = useNotification();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleRegistration = async () => {
        if (password !== confirmPassword) {
            alert('error', 'Пароли не совпадают');
            return;
        }
        if (!name || !email || !password) {
            alert('error', 'Заполните все обязательные поля');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await registerAction({
                email,
                password,
                name,
                phone: phone || undefined,
            });
            if (!result.ok) {
                setError(result.error);
                alert('error', result.error);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : '';
            if (!message.includes('NEXT_REDIRECT')) {
                alert('error', 'Произошла ошибка при регистрации');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popup title="Регистрация">
            <Input
                type="text"
                placeholder="Имя"
                value={name}
                setValue={setName}
                transitionDelay={0.25}
            />

            <Input
                type="email"
                placeholder="Email"
                value={email}
                setValue={setEmail}
                transitionDelay={0.35}
            />

            <Input
                type="tel"
                placeholder="Телефон (необязательно)"
                value={phone}
                setValue={setPhone}
                transitionDelay={0.4}
            />

            <Input
                type="password"
                placeholder="Пароль"
                value={password}
                setValue={setPassword}
                showButton={true}
                transitionDelay={0.45}
            />

            <Input
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                setValue={setConfirmPassword}
                showButton={true}
                transitionDelay={0.5}
            />

            {error && (
                <motion.p
                    className="text-red-400 text-sm mb-4 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.55 }}
                >
                    {error}
                </motion.p>
            )}

            <div className="flex justify-center mt-4">
                <Button
                    onClick={handleRegistration}
                    loading={loading}
                    transitionDelay={0.6}
                >
                    Зарегистрироваться
                </Button>
            </div>

            <motion.p
                className="mt-6 text-purple-400 text-sm text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65 }}
            >
                Есть аккаунт?{' '}
                <Link href={routes.LOGIN} className="underline hover:text-purple-300">
                    войдите
                </Link>
            </motion.p>
        </Popup>
    );
}
