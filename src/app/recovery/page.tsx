'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../supabaseClient';
import { routes } from '@/routes/routes';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

export default function RecoveryPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: process.env.NEXT_PUBLIC_REDIRECT_URL + routes.DASHBOARD
                }
            });

            if (error) {
                setError(error.message);
            } else {
                alert('Проверьте свою почту для входа в систему');
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
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            >
                <motion.h2
                    className="text-3xl font-bold text-white mb-6 text-center"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    Вход через email
                </motion.h2>

                <motion.input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Введите ваш email"
                    className="w-full px-4 py-3 mb-4 bg-purple-800 text-white placeholder-purple-300 rounded-xl border border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
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

                <motion.button
                    onClick={handleLogin}
                    disabled={loading}
                    className="cursor-pointer w-full py-3 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    {loading ? 'Отправляем...' : 'Отправить ссылку входа'}
                </motion.button>

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
            </motion.div>
        </div>
    );
}
