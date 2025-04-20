'use client';

import {useState} from 'react';
import Link from "next/link";
import {supabase} from "../../../supabaseClient";
import {useRouter} from "next/navigation";
import {routes} from "@/routes/routes";

export default function RegistrationPage() {
    const router = useRouter();
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
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { role: 'admin' } },
                });
                if (error) {
                    setError(error.message);
                } else {
                    console.log(data)
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
            <div
                className="w-full max-w-md bg-purple-900 bg-opacity-20 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-purple-700">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">
                    Регистрация
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

                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите пароль"
                    className="w-full px-4 py-3 mb-4 bg-purple-800 text-white placeholder-purple-300 rounded-xl border border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

                <button
                    onClick={handleRegistration}
                    className="w-full cursor-pointer py-3 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-xl transition"
                    disabled={loading}
                >
                    {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>

                <p className="mt-6 text-purple-400 text-sm text-center">
                    Есть аккаунт? <Link href={routes.LOGIN} className="underline hover:text-purple-300">войдите</Link>
                </p>
            </div>
        </div>
    );
}
