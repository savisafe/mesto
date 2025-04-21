'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../supabaseClient';
import {routes} from "@/routes/routes";
import {useAuth} from "@/context/AuthContext";

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const { setAccessToken } = useAuth();

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                setError(error.message);
            } else {
                setAccessToken(data.session.access_token);
                router.push('/dashboard');
            }
        }
        catch (err) {
            setError((err as Error).message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-950 to-black flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-purple-900 bg-opacity-20 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-purple-700">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">
                    Вход в систему
                </h2>

                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full px-4 py-3 mb-4 bg-purple-800 text-white placeholder-purple-300 rounded-xl border border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Пароль"
                    className="w-full px-4 py-3 mb-4 bg-purple-800 text-white placeholder-purple-300 rounded-xl border border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full py-3 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
                >
                    {loading ? 'Входим...' : 'Войти'}
                </button>

                <p className="mt-6 text-purple-400 text-sm text-center">
                    Нет аккаунта?{' '}
                    <a href={routes.REGISTRATION} className="underline hover:text-purple-300">
                        Зарегистрируйтесь
                    </a>
                </p>
            </div>
        </div>
    );
}
