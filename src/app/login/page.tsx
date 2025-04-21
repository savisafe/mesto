'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '../../../supabaseClient';
import {routes} from '@/routes/routes';
import {useAuth} from '@/context/AuthContext';
import {motion} from 'framer-motion';
import {Input} from "@/ui/input/Input";
import {Button} from "@/ui/button/Button";

export default function LoginPage() {
    const router = useRouter();
    const {setAccessToken} = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const {data, error} = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                setError(error.message);
            } else {
                setAccessToken(data.session.access_token);
                router.push('/dashboard');
            }
        } catch (err) {
            setError((err as Error).message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-950 to-black flex items-center justify-center px-4">
            <motion.div
                className="w-full max-w-md bg-purple-900 bg-opacity-20 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-purple-700"
                initial={{opacity: 0, y: 40}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.6, ease: 'easeOut'}}
            >
                <motion.h2
                    className="text-3xl font-bold text-white mb-6 text-center"
                    initial={{opacity: 0, y: -20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 0.2}}
                >
                    Вход в систему
                </motion.h2>

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

                {error && (
                    <motion.p
                        className="text-red-400 text-sm mb-4 text-center"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        transition={{delay: 0.45}}
                    >
                        {error}
                    </motion.p>
                )}

                <Button
                    onClick={handleLogin}
                    loading={loading}
                    text="Войти"
                    transitionDelay={0.5}
                />

                <motion.div
                    className="flex justify-between items-center mt-4 text-sm text-purple-400"
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    transition={{delay: 0.55}}
                >
                    <a href={routes.RECOVERY} className="underline hover:text-purple-300">
                        Забыли пароль?
                    </a>
                    <a href={routes.REGISTRATION} className="underline hover:text-purple-300">
                        Регистрация
                    </a>
                </motion.div>
            </motion.div>
        </div>
    );
}
