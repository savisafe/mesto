'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { routes } from "@/routes/routes";
import { motion } from 'framer-motion';
import { Button } from "@/ui/button/Button";
import { Input } from "@/ui/input/Input";
import { Popup } from "@/ui/popup/Popup";
import { useNotification } from "@/contexts/NotificationContext";
import Link from "next/link";
import { useAuth } from '@/contexts/AuthContext';

interface Invite {
    id: string;
    email: string;
    business_id: string;
    accepted: boolean;
    expires_at: string;
}

export default function RegistrationPage() {
    const router = useRouter();
    const alert = useNotification();
    const {register} = useAuth();
    const searchParams = useSearchParams();
    const [inviteId, setInviteId] = useState<string | null>(null);
    const [invite] = useState<Invite | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const id = searchParams?.get('invite');
        if (id) {
            setInviteId(id);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchInvite = async () => {
            if (!inviteId) return;
            // TODO: Реализовать получение информации о приглашении
            // Пока что просто показываем сообщение
            alert('info', 'Регистрация по приглашению временно недоступна');
        };

        fetchInvite();
    }, [inviteId, alert]);

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
            const result = await register({
                email,
                password,
                name,
                phone: phone || undefined,
            });

            if (result.success) {
                alert('success', 'Регистрация прошла успешно!');
                router.push(routes.DASHBOARD);
            } else {
                alert('error', result.error || 'Ошибка регистрации');
            }
        } catch {
            alert('error', 'Произошла ошибка при регистрации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popup title={invite ? 'Регистрация сотрудника' : 'Регистрация'}>
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
                Есть аккаунт? <Link href={routes.LOGIN} className="underline hover:text-purple-300">войдите</Link>
            </motion.p>
        </Popup>
    );
}