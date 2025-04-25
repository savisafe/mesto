'use client';

import {useState} from 'react';
import {supabase} from '../../../supabaseClient';
import {routes} from '@/routes/routes';
import {motion} from 'framer-motion';
import {Popup} from "@/ui/popup/Popup";
import {Input} from "@/ui/input/Input";
import {useRouter} from "next/navigation";
import {useAuth} from "@/context/AuthContext";

export default function LoginOTPPage() {
    const router = useRouter();
    const {accessToken} = useAuth();
    if (accessToken) return router.back();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLoginOTP = async () => {
        setLoading(true);
        setError(null);
        const {error} = await supabase.auth.signInWithOtp({
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
        setLoading(false);
    };

    return (
        <Popup title={'Вход через email'}>
            <Input
                type="email"
                placeholder="Введите ваш email"
                value={email}
                setValue={setEmail}
                transitionDelay={0.35}
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

            <motion.button
                onClick={handleLoginOTP}
                disabled={loading}
                className="cursor-pointer w-full py-3 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: 0.5}}
            >
                {loading ? 'Отправляем...' : 'Отправить ссылку входа'}
            </motion.button>

            <motion.div
                className="flex justify-between items-center mt-4 text-sm text-purple-400"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{delay: 0.55}}
            >
                <a href={routes.LOGIN} className="underline hover:text-purple-300">
                    Вход
                </a>
                <a href={routes.REGISTRATION} className="underline hover:text-purple-300">
                    Регистрация
                </a>
            </motion.div>
        </Popup>
    );
}
