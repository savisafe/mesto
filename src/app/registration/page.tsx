'use client';

import {useState} from 'react';
import Link from "next/link";
import {supabase} from "../../../supabaseClient";
import {useRouter} from "next/navigation";
import {routes} from "@/routes/routes";
import {motion} from 'framer-motion';
import {Button} from "@/ui/button/Button";
import {Input} from "@/ui/input/Input";
import {Popup} from "@/ui/popup/Popup";

export default function RegistrationPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleRegistration = async () => {
        if (password === confirmPassword) {
            setLoading(true);
            setError(null);
            try {
                const {error} = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: process.env.NEXT_PUBLIC_REDIRECT_URL + routes.DASHBOARD,
                        data: {
                            name: name,
                            role: 'admin',
                        }
                    },
                });
                if (error) {
                    setError(error.message);
                } else {
                    alert('Проверьте почту для подтверждения регистрации');
                    router.push('/login');
                }
            } catch (err) {
                setError((err as Error).message);
            }
        } else {
            //TODO добавить уведомления
            alert('Пароли не совпадают');
        }
        setLoading(false);
    };

    return (
        <Popup title={'Регистрация'}>
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
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    transition={{delay: 0.5}}
                >
                    {error}
                </motion.p>}

            <Button
                onClick={handleRegistration}
                loading={loading}
                text="Зарегистрироваться"
                transitionDelay={0.55}
            />

            <motion.p
                className="mt-6 text-purple-400 text-sm text-center"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.6}}>
                Есть аккаунт? <Link href={routes.LOGIN} className="underline hover:text-purple-300">войдите</Link>
            </motion.p>
        </Popup>
    );
}
