'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { routes } from "@/routes/routes";
import { motion } from 'framer-motion';
import { Button } from "@/ui/button/Button";
import { Input } from "@/ui/input/Input";
import { Popup } from "@/ui/popup/Popup";
import { useNotification } from "@/contexts/NotificationContext";
import { roles } from "@/types/types";
import Link from "next/link";
import {supabase} from "../../supabaseClient";

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
    const searchParams = useSearchParams();
    const [inviteId, setInviteId] = useState<string | null>(null);
    const [invite, setInvite] = useState<Invite | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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

            const { data, error } = await supabase
                .from('employee_invitations')
                .select('*')
                .eq('id', inviteId)
                .eq('accepted', false)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error || !data) {
                alert('error', 'Приглашение не найдено или истекло');
                router.push(routes.LOGIN);
            } else {
                setInvite(data);
            }
        };

        fetchInvite();
    }, [inviteId]);

    const handleRegistration = async () => {
        if (password !== confirmPassword) {
            alert('error', 'Пароли не совпадают');
            return;
        }

        setLoading(true);
        setError(null);

        if (invite && email.toLowerCase() !== invite.email.toLowerCase()) {
            alert('error', 'Email не совпадает с приглашением');
            setLoading(false);
            return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: process.env.NEXT_PUBLIC_URL + routes.CREATE_BUSINESS,
                data: {
                    name: name,
                    role: invite ? roles.employee : roles.owner,
                }
            },
        });

        if (signUpError) {
            alert('error', signUpError.message);
            setLoading(false);
            return;
        }

        if (invite) {
            await supabase.from('employees').insert({
                business_id: invite.business_id,
                user_id: signUpData?.user?.id,
                role: 'employee',
            });

            await supabase.from('employee_invitations')
                .update({ accepted: true })
                .eq('id', inviteId);
        }

        alert('success', 'Проверьте почту для подтверждения регистрации');
        router.push(routes.LOGIN);
        setLoading(false);
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
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    setValue={setPassword}
                    showButton={true}
                    transitionDelay={0.4}
                />

                <Input
                    type="password"
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    setValue={setConfirmPassword}
                    showButton={true}
                    transitionDelay={0.45}
                />

                {error &&
                    <motion.p
                        className="text-red-400 text-sm mb-4 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        {error}
                    </motion.p>}

                <div className="flex justify-center mt-4">
                    <Button
                        onClick={handleRegistration}
                        loading={loading}
                        transitionDelay={0.55}
                    >
                        Зарегистрироваться
                    </Button>
                </div>

                <motion.p
                    className="mt-6 text-purple-400 text-sm text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6}}>
                    Есть аккаунт? <Link href={routes.LOGIN} className="underline hover:text-purple-300">войдите</Link>
                </motion.p>
            </Popup>
    );
}
