'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/ui/input/Input';
import { Button } from '@/ui/button/Button';
import { Popup } from '@/ui/popup/Popup';
import { LayoutPage } from '@/ui/layouts/LayoutPage';
import { useNotification } from '@/contexts/NotificationContext';
import { loginAction } from '@/actions/auth';
import { routes } from '@/routes/routes';

export default function LoginPage() {
    const alert = useNotification();
    const searchParams = useSearchParams();
    const next = searchParams?.get('next') ?? undefined;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            alert('error', 'Заполните все поля');
            return;
        }

        setLoading(true);
        try {
            const result = await loginAction({ email, password }, next);
            // успешный логин → redirect внутри action, сюда не доберёмся.
            if (!result.ok) {
                alert('error', result.error);
            }
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
        <LayoutPage>
            <Popup title={'Вход в систему'}>
                <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    setValue={setEmail}
                    transitionDelay={0.3}
                />

                <Input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    setValue={setPassword}
                    showButton={true}
                    transitionDelay={0.4}
                />

                <div className="flex justify-center mt-4">
                    <Button onClick={handleLogin} loading={loading} transitionDelay={0.45}>
                        Войти в систему
                    </Button>
                </div>

                <motion.div
                    className="flex justify-between items-center mt-4 text-sm text-purple-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <a href={routes.LOGIN_OTP} className="underline hover:text-purple-300">
                        Войти через почту
                    </a>
                    <a href={routes.REGISTRATION} className="underline hover:text-purple-300">
                        Регистрация
                    </a>
                </motion.div>
            </Popup>
        </LayoutPage>
    );
}
