'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '../../supabaseClient';
import {routes} from '@/routes/routes';
import {useAuth} from '@/context/AuthContext';
import {motion} from 'framer-motion';
import {Input} from "@/ui/input/Input";
import {Button} from "@/ui/button/Button";
import {Popup} from "@/ui/popup/Popup";
import {useNotification} from "@/context/NotificationContext";
import {LayoutPage} from "@/ui/layouts/LayoutPage";
import {roles} from "@/types/types";

export default function LoginPage() {
    const router = useRouter()
    const {setAccessToken} = useAuth();
    const alert = useNotification();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        const {data, error} = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) {
            //TODO переводить ошибки
            alert('error', error.message);
        } else {
            setAccessToken(data.session.access_token);
            const role = data?.user?.user_metadata?.role
            if (role === roles.employee || role === roles.manager) {
                router.replace(routes.CALENDAR)
            } else {
                router.replace(routes.DASHBOARD)
            }
        }
        setLoading(false);
    };

    return (
        <LayoutPage>
            <Popup title={'Вход в систему'}>
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

                <div className="flex justify-center mt-4">
                    <Button
                        onClick={handleLogin}
                        loading={loading}
                        transitionDelay={0.45}
                    >
                        Войти  в систему
                    </Button>
                </div>

                <motion.div
                    className="flex justify-between items-center mt-4 text-sm text-purple-400"
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    transition={{delay: 0.5}}
                >
                    <a href={routes.LOGIN_OTP} className="underline hover:text-purple-300">
                        Войти через почту
                    </a>
                    <a href={routes.REGISTRATION} className="underline hover:text-purple-300">
                        Регистрация
                    </a>
                </motion.div>
            </Popup>
        </LayoutPage>
    );
}
