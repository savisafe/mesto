import {
    LayoutDashboard,
    CalendarDays,
    CalendarClock,
    Users,
    UserCog,
    Building2,
    Wallet,
    Star,
    Settings,
    Code2,
    Smartphone,
    type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/db/schema';
import { routes } from '@/routes/routes';

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    // Активна только при точном совпадении пути (для вложенных разделов вроде /settings).
    exact?: boolean;
    // Если задано — пункт виден только этим ролям. Пусто — виден всем залогиненным.
    roles?: UserRole[];
}

export interface NavGroup {
    label: string;
    items: NavItem[];
}

export const navGroups: NavGroup[] = [
    {
        label: 'Работа',
        items: [
            { href: routes.DASHBOARD, label: 'Дашборд', icon: LayoutDashboard },
            { href: routes.CALENDAR, label: 'Календарь', icon: CalendarDays },
            { href: routes.SCHEDULE, label: 'График', icon: CalendarClock },
        ],
    },
    {
        label: 'Клиентская база',
        items: [
            { href: routes.CLIENTS, label: 'Клиенты', icon: Users },
            { href: routes.EMPLOYEES, label: 'Сотрудники', icon: UserCog },
            { href: routes.MY_BUSINESS, label: 'Бизнесы', icon: Building2 },
        ],
    },
    {
        label: 'Аналитика',
        items: [
            { href: routes.FINANCE, label: 'Финансы', icon: Wallet },
            { href: routes.REVIEWS, label: 'Отзывы', icon: Star },
        ],
    },
    {
        label: 'Система',
        items: [
            { href: routes.SETTINGS, label: 'Настройки', icon: Settings, exact: true },
            { href: routes.SETTINGS_API, label: 'API', icon: Code2 },
            { href: routes.INSTALL, label: 'Приложение', icon: Smartphone },
        ],
    },
];

export const isNavItemActive = (pathname: string, item: NavItem): boolean =>
    item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);

export const getActiveNavLabel = (pathname: string): string | null => {
    for (const group of navGroups) {
        for (const item of group.items) {
            if (isNavItemActive(pathname, item)) return item.label;
        }
    }
    return null;
};
