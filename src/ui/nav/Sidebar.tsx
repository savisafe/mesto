'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Logo } from '@/ui/logo/Logo';
import { navGroups } from './navItems';
import { NavLink } from './NavLink';

interface SidebarProps {
    collapsed: boolean;
    onToggleCollapsed: () => void;
}

export const Sidebar = ({ collapsed, onToggleCollapsed }: SidebarProps) => (
    <aside
        className={clsx(
            'hidden shrink-0 border-r border-purple-800/60 bg-purple-950/40 backdrop-blur lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col',
            collapsed ? 'lg:w-[4.75rem]' : 'lg:w-64',
        )}
    >
        <div
            className={clsx(
                'flex h-16 items-center border-b border-purple-800/60 px-4',
                collapsed && 'justify-center px-0',
            )}
        >
            <Link href="/" aria-label="На главную">
                <Logo size={32} withWordmark={!collapsed} />
            </Link>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
            {navGroups.map((group) => (
                <div key={group.label} className="space-y-1">
                    {!collapsed && (
                        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-purple-500">
                            {group.label}
                        </p>
                    )}
                    {group.items.map((item) => (
                        <NavLink key={item.href} item={item} collapsed={collapsed} />
                    ))}
                </div>
            ))}
        </nav>

        <div className="border-t border-purple-800/60 p-3">
            <button
                onClick={onToggleCollapsed}
                aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
                className={clsx(
                    'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-purple-300 transition hover:bg-purple-800/40 hover:text-white',
                    collapsed && 'justify-center',
                )}
            >
                {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                {!collapsed && <span>Свернуть</span>}
            </button>
        </div>
    </aside>
);
