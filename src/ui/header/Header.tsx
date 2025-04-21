'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Menu, X} from 'lucide-react';
import {AnimatePresence, motion} from 'framer-motion';
import {useAuth} from "@/context/AuthContext";
import {supabase} from "../../../supabaseClient";
import {routes} from "@/routes/routes";
import {redirect} from "next/navigation";

const navLinks = [
    {href: '/dashboard', label: 'Дашборд'},
    {href: '/calendar', label: 'Календарь'},
    {href: '/clients', label: 'Клиенты'},
    {href: '/employees', label: 'Сотрудники'},
    {href: '/finance', label: 'Финансы'},
    {href: '/reviews', label: 'Отзывы'},
    {href: '/settings', label: 'Настройки'},
];

export function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const { accessToken, setAccessToken } = useAuth();

    const logout = async () => {
        await supabase.auth.signOut();
        setAccessToken(null);
        redirect(routes.HOME)
    };

    return (
        <header className="w-full bg-purple-900 bg-opacity-30 border-b border-purple-800 px-6 py-4 relative z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold text-white">
                    Mesto<span className="text-purple-400">.pro</span>
                </Link>

                {/* Desktop nav */}
                <nav className="sm:[display:none] md:flex gap-6 text-sm text-purple-300">
                    {navLinks.map(link => (
                        <Link key={link.href} href={link.href} className="hover:text-white">
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {accessToken
                    ? (
                        <div className="sm:[display:none] md:block text-sm text-purple-300">
                            👤 Дарья | <button className="cursor-pointer hover:text-white" onClick={logout}>Выйти</button>
                        </div>
                    )
                    : (
                        <Link href={routes.LOGIN} className="cursor-pointer hover:text-white">Войти</Link>
                    )
                }

                {/* Burger */}
                <button
                    className="text-white md:hidden"
                    onClick={() => setIsOpen(prev => !prev)}
                    aria-label="Меню"
                >
                    {isOpen ? <X size={28}/> : <Menu size={28}/>}
                </button>
            </div>

            {/* Mobile nav with animation */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{opacity: 0, scale: 0.95, y: -10}}
                        animate={{opacity: 1, scale: 1, y: 0}}
                        exit={{opacity: 0, scale: 0.95, y: -10}}
                        transition={{duration: 0.25}}
                        className="md:hidden absolute top-full left-0 w-full bg-purple-950 bg-opacity-90 backdrop-blur border-t border-purple-800 p-6 space-y-4"
                    >
                        {navLinks.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="block text-sm text-purple-300 hover:text-white"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        {accessToken
                            ? (
                                <div className="pt-4 border-t border-purple-700 text-sm text-purple-300">
                                    👤 Дарья | <button className="cursor-pointer hover:text-white" onClick={logout}>Выйти</button>
                                </div>
                            )
                            : (
                                <Link href={routes.LOGIN} className="cursor-pointer hover:text-white">Войти</Link>
                            )
                        }
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
