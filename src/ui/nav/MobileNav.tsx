'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, LogOut } from 'lucide-react';
import { Logo } from '@/ui/logo/Logo';
import { InstallButton } from '@/ui/pwa/InstallButton';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRole } from '@/hooks/useAccess';
import { getVisibleNavGroups } from './navItems';
import { NavLink } from './NavLink';

interface MobileNavProps {
    open: boolean;
    onClose: () => void;
}

export const MobileNav = ({ open, onClose }: MobileNavProps) => {
    const { userName, logout } = useAuth();
    const { role } = useEffectiveRole();
    const visibleGroups = getVisibleNavGroups(role);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="backdrop"
                    className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                />
            )}
            {open && (
                <motion.aside
                    key="drawer"
                    className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] flex-col border-r border-purple-800/60 bg-purple-950/95 backdrop-blur lg:hidden"
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'tween', duration: 0.25 }}
                >
                    <div className="flex h-16 items-center justify-between border-b border-purple-800/60 px-4">
                        <Logo size={32} />
                        <button
                            onClick={onClose}
                            aria-label="Закрыть меню"
                            className="cursor-pointer rounded-lg p-1.5 text-purple-300 hover:bg-purple-800/40 hover:text-white"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
                        {visibleGroups.map((group) => (
                            <div key={group.label} className="space-y-1">
                                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-purple-500">
                                    {group.label}
                                </p>
                                {group.items.map((item) => (
                                    <NavLink key={item.href} item={item} onNavigate={onClose} />
                                ))}
                            </div>
                        ))}
                    </nav>

                    <div className="space-y-3 border-t border-purple-800/60 p-4">
                        <InstallButton className="w-full justify-center" />
                        <div className="flex items-center justify-between text-sm text-purple-300">
                            <span className="flex min-w-0 items-center gap-2">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                                    {userName.charAt(0).toUpperCase()}
                                </span>
                                <span className="truncate">{userName}</span>
                            </span>
                            <button
                                onClick={logout}
                                aria-label="Выйти"
                                className="flex shrink-0 cursor-pointer items-center gap-1.5 hover:text-white"
                            >
                                <LogOut size={16} /> Выйти
                            </button>
                        </div>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
};
