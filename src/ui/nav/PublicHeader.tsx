'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes/routes';
import { Logo } from '@/ui/logo/Logo';
import { InstallButton } from '@/ui/pwa/InstallButton';

export const PublicHeader = () => {
    const { user } = useAuth();

    return (
        <header className="relative z-50 w-full border-b border-purple-800 bg-purple-900/30 px-6 py-4">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
                <Link href="/" aria-label="На главную">
                    <Logo size={36} />
                </Link>
                <div className="flex items-center gap-4 text-sm text-purple-300">
                    <InstallButton />
                    {user ? (
                        <Link href={routes.DASHBOARD} className="font-semibold hover:text-white">
                            Открыть кабинет
                        </Link>
                    ) : (
                        <Link href={routes.LOGIN} className="hover:text-white">
                            Войти
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
};
