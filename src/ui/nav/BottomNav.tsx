'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Menu } from 'lucide-react';
import { useEffectiveRole } from '@/hooks/useAccess';
import { getBottomNavItems, isNavItemActive } from './navItems';

interface BottomNavProps {
    // Открывает выдвижное меню «Ещё» (полная навигация + переключатель бизнеса).
    onOpenMore: () => void;
}

// Нижняя таб-панель для мобильных: основные разделы + «Ещё». На desktop скрыта
// (там сайдбар). Заменяет на мобильном гамбургер и кнопку «назад».
export const BottomNav = ({ onOpenMore }: BottomNavProps) => {
    const pathname = usePathname();
    const { role } = useEffectiveRole();
    const items = getBottomNavItems(role);
    const onPrimaryTab = items.some((item) => isNavItemActive(pathname, item));

    const tabClass = (active: boolean) =>
        clsx(
            'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition',
            active ? 'text-white' : 'text-purple-400 hover:text-white',
        );

    return (
        <nav
            aria-label="Основная навигация"
            className="fixed inset-x-0 bottom-0 z-30 flex border-t border-purple-800/60 bg-purple-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
            {items.map((item) => {
                const active = isNavItemActive(pathname, item);
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={tabClass(active)}
                    >
                        <Icon size={22} className={clsx('shrink-0', active && 'text-purple-300')} />
                        <span className="max-w-full truncate px-1">{item.label}</span>
                    </Link>
                );
            })}
            <button onClick={onOpenMore} aria-label="Ещё" className={tabClass(!onPrimaryTab)}>
                <Menu size={22} className="shrink-0" />
                <span>Ещё</span>
            </button>
        </nav>
    );
};
