'use client';

import Link from 'next/link';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes/routes';

export const UserMenu = () => {
    const { userName, logout } = useAuth();

    return (
        <Menu as="div" className="relative">
            <MenuButton className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm text-purple-200 transition hover:bg-purple-800/40 hover:text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                    {userName.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[10rem] truncate sm:block">{userName}</span>
                <ChevronDown size={16} className="text-purple-400" />
            </MenuButton>
            <MenuItems
                transition
                anchor="bottom end"
                className="z-50 mt-2 w-52 rounded-xl border border-purple-700/60 bg-purple-950/95 p-1.5 text-sm shadow-2xl backdrop-blur transition data-[closed]:scale-95 data-[closed]:opacity-0"
            >
                <MenuItem>
                    <Link
                        href={routes.SETTINGS}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-purple-200 data-[focus]:bg-purple-800/50 data-[focus]:text-white"
                    >
                        <Settings size={16} /> Настройки
                    </Link>
                </MenuItem>
                <MenuItem>
                    <button
                        onClick={logout}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-purple-200 data-[focus]:bg-purple-800/50 data-[focus]:text-white"
                    >
                        <LogOut size={16} /> Выйти
                    </button>
                </MenuItem>
            </MenuItems>
        </Menu>
    );
};
