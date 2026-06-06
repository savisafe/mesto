'use client';

import { usePathname } from 'next/navigation';
import { Menu as MenuIcon } from 'lucide-react';
import { InstallButton } from '@/ui/pwa/InstallButton';
import { getActiveNavLabel } from './navItems';
import { UserMenu } from './UserMenu';

interface TopbarProps {
    onOpenMobileNav: () => void;
}

export const Topbar = ({ onOpenMobileNav }: TopbarProps) => {
    const pathname = usePathname();
    const title = getActiveNavLabel(pathname) ?? 'Mesto';

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-purple-800/60 bg-purple-950/70 px-4 backdrop-blur md:px-6">
            <button
                onClick={onOpenMobileNav}
                aria-label="Открыть меню"
                className="cursor-pointer rounded-lg p-1.5 text-purple-200 hover:bg-purple-800/40 hover:text-white lg:hidden"
            >
                <MenuIcon size={24} />
            </button>
            <h1 className="truncate text-lg font-semibold text-white">{title}</h1>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <InstallButton />
                <UserMenu />
            </div>
        </header>
    );
};
