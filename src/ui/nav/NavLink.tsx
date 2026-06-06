'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { isNavItemActive, type NavItem } from './navItems';

interface NavLinkProps {
    item: NavItem;
    collapsed?: boolean;
    onNavigate?: () => void;
}

export const NavLink = ({ item, collapsed = false, onNavigate }: NavLinkProps) => {
    const pathname = usePathname();
    const active = isNavItemActive(pathname, item);
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            className={clsx(
                'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                collapsed && 'justify-center',
                active
                    ? 'bg-purple-600/30 text-white ring-1 ring-purple-500/40'
                    : 'text-purple-300 hover:bg-purple-800/40 hover:text-white',
            )}
        >
            <Icon size={20} className="shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
    );
};
