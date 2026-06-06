'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes/routes';
import { Logo } from '@/ui/logo/Logo';
import { InstallButton } from '@/ui/pwa/InstallButton';

const protectedLinks = [
    { href: routes.DASHBOARD, label: 'Дашборд' },
    { href: routes.CALENDAR, label: 'Календарь' },
    { href: routes.SCHEDULE, label: 'График' },
    { href: routes.CLIENTS, label: 'Клиенты' },
    { href: routes.EMPLOYEES, label: 'Сотрудники' },
    { href: routes.MY_BUSINESS, label: 'Бизнесы' },
    { href: routes.SETTINGS_API, label: 'API' },
];

const publicLinks: { href: string; label: string }[] = [];

export function Header() {
    const ref = useRef<HTMLDivElement | null>(null);
    const { user, userName, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const navLinks = user ? protectedLinks : publicLinks;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <header className="w-full bg-purple-900 bg-opacity-30 border-b border-purple-800 px-6 py-4 relative z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link href="/" aria-label="На главную">
                    <Logo size={36} />
                </Link>

                <nav className="flex [@media(max-width:640px)]:hidden gap-6 text-sm text-purple-300">
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="hover:text-white">
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-4 [@media(max-width:640px)]:hidden">
                    <InstallButton />
                    {user ? (
                        <div className="text-sm text-purple-300">
                            👤 {userName} |{' '}
                            <button
                                className="cursor-pointer hover:text-white"
                                onClick={logout}
                            >
                                Выйти
                            </button>
                        </div>
                    ) : (
                        <Link href={routes.LOGIN} className="cursor-pointer hover:text-white">
                            Войти
                        </Link>
                    )}
                </div>

                <button
                    className="text-white [display:none] [@media(max-width:640px)]:block"
                    onClick={() => setIsOpen((prev) => !prev)}
                    aria-label="Меню"
                >
                    {isOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={ref}
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="md:hidden absolute top-full left-0 w-full bg-purple-950 bg-opacity-90 backdrop-blur border-t border-purple-800 p-6 space-y-4"
                    >
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="block text-sm text-purple-300 hover:text-white"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <InstallButton className="w-full justify-center" />
                        {user ? (
                            <div className="pt-4 border-t border-purple-700 text-sm text-purple-300">
                                👤 {userName} |{' '}
                                <button
                                    className="cursor-pointer hover:text-white"
                                    onClick={logout}
                                >
                                    Выйти
                                </button>
                            </div>
                        ) : (
                            <Link
                                href={routes.LOGIN}
                                className="cursor-pointer hover:text-white"
                            >
                                Войти
                            </Link>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
