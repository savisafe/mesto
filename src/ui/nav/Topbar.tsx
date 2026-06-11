'use client';

import { usePathname } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { getActiveNavLabel } from './navItems';
import { BusinessSwitcher } from './BusinessSwitcher';
import { UserMenu } from './UserMenu';

interface TopbarProps {
    // На мобильном тап по названию бизнеса открывает «Ещё» (там переключатель).
    onOpenMobileNav: () => void;
}

export const Topbar = ({ onOpenMobileNav }: TopbarProps) => {
    const pathname = usePathname();
    const title = getActiveNavLabel(pathname) ?? 'Mesto';
    const { businessesData, currentBusiness } = useBusiness();
    const current = businessesData.find((b) => b.id === currentBusiness);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-purple-800/60 bg-purple-950/70 px-4 backdrop-blur md:px-6">
            {/* Desktop: название текущего раздела (навигация — в сайдбаре). */}
            <h1 className="hidden truncate text-lg font-semibold text-white lg:block">{title}</h1>

            {/* Мобильный: название бизнеса как контекст; тап открывает «Ещё» с
                переключателем. Навигация — в нижней таб-панели. */}
            {current ? (
                <button
                    onClick={onOpenMobileNav}
                    aria-label="Меню и выбор бизнеса"
                    className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg py-1 pr-2 text-left text-white lg:hidden"
                >
                    <Building2 size={18} className="shrink-0 text-purple-300" />
                    <span className="truncate text-base font-semibold">{current.name}</span>
                </button>
            ) : (
                <h1 className="truncate text-base font-semibold text-white lg:hidden">{title}</h1>
            )}

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <div className="hidden lg:block">
                    <BusinessSwitcher />
                </div>
                <UserMenu />
            </div>
        </header>
    );
};
