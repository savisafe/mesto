'use client';

import {useState} from 'react';
import Link from "next/link";
import {supabase} from "../../../supabaseClient";
import {useRouter} from "next/navigation";
import {routes} from "@/routes/routes";
import {motion} from 'framer-motion';
import {Button} from "@/ui/button/Button";
import {Input} from "@/ui/input/Input";

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
                const {data, error} = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: process.env.NEXT_PUBLIC_REDIRECT_URL + routes.DASHBOARD,
                        data: {
                            name: name,
                            role: 'admin'
                        }
                    },
                });
                if (error) {
                    setError(error.message);
                } else {
                    console.log(data)
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
        <div className="min-h-screen bg-gradient-to-br from-purple-950 to-black flex items-center justify-center px-4">
            <motion.div
                className="w-full max-w-md bg-purple-900 bg-opacity-20 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-purple-700"
                initial={{opacity: 0, y: 40}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.6, ease: 'easeOut'}}>
                <motion.h2
                    className="text-3xl font-bold text-white mb-6 text-center"
                    initial={{opacity: 0, y: -20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 0.2}}>
                    Регистрация
                </motion.h2>

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
                    transitionDelay={0.3}
                />

                <Input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    setValue={setPassword}
                    showButton={true}
                    transitionDelay={0.35}
                />

                <Input
                    type="password"
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    setValue={setConfirmPassword}
                    showButton={true}
                    transitionDelay={0.4}
                />

                {error &&
                    <motion.p
                        className="text-red-400 text-sm mb-4 text-center"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        transition={{delay: 0.45}}
                    >
                        {error}
                    </motion.p>}

                <Button
                    onClick={handleRegistration}
                    loading={loading}
                    text="Зарегистрироваться"
                    transitionDelay={0.5}
                />

                <motion.p
                    className="mt-6 text-purple-400 text-sm text-center"
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    transition={{delay: 0.6}}>
                    Есть аккаунт? <Link href={routes.LOGIN} className="underline hover:text-purple-300">войдите</Link>
                </motion.p>
            </motion.div>
        </div>
    );
}
