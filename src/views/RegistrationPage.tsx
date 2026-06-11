'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/ui/button/Button';
import { TextField, PasswordField } from '@/ui/form';
import { Popup } from '@/ui/popup/Popup';
import { useNotification } from '@/contexts/NotificationContext';
import { registerAction } from '@/actions/auth';
import { routes, authPathWithParams } from '@/routes/routes';

export default function RegistrationPage() {
    const alert = useNotification();
    const searchParams = useSearchParams();
    // Контекст приглашения: куда вернуться после регистрации и какой email
    // ожидается (предзаполняем, чтобы он совпал с приглашением).
    const next = searchParams?.get('next') ?? undefined;
    const invitedEmail = searchParams?.get('email') ?? '';
    const [name, setName] = useState('');
    const [email, setEmail] = useState(invitedEmail);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegistration = async (e: FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert('error', 'Пароли не совпадают');
            return;
        }
        if (!name || !email || !password || !phone) {
            alert('error', 'Заполните все обязательные поля');
            return;
        }

        setLoading(true);
        try {
            const result = await registerAction({ email, password, name, phone }, next);
            if (!result.ok) alert('error', result.error);
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
            <form onSubmit={handleRegistration}>
                <TextField label="Имя" autoComplete="name" autoFocus value={name} onChange={setName} />
                <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={setEmail}
                />
                <TextField
                    label="Телефон"
                    hint="Обязательно — для подтверждения аккаунта и связи с клиентами"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={setPhone}
                />
                <PasswordField
                    label="Пароль"
                    hint="Минимум 8 символов"
                    autoComplete="new-password"
                    value={password}
                    onChange={setPassword}
                />
                <PasswordField
                    label="Повторите пароль"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                />

                <div className="flex justify-center mt-4">
                    <Button type="submit" loading={loading}>
                        Зарегистрироваться
                    </Button>
                </div>
            </form>

            <p className="mt-6 text-purple-400 text-sm text-center">
                Есть аккаунт?{' '}
                <Link
                    href={authPathWithParams(routes.LOGIN, { next, email: invitedEmail })}
                    className="underline hover:text-purple-300"
                >
                    войдите
                </Link>
            </p>
        </Popup>
    );
}
