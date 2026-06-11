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

// Ролевые наборы для гейтинга. Роли — «по бизнесу» (OWNER/MANAGER/EMPLOYEE);
// глобальный ADMIN добавлен как платформенный супер-доступ (см. useEffectiveRole).
const OWNER_ONLY: UserRole[] = ['OWNER', 'ADMIN'];
const OWNER_AND_MANAGER: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER'];

export const navGroups: NavGroup[] = [
    {
        label: 'Работа',
        items: [
            { href: routes.DASHBOARD, label: 'Дашборд', icon: LayoutDashboard },
            { href: routes.CALENDAR, label: 'Календарь', icon: CalendarDays },
            { href: routes.SCHEDULE, label: 'График', icon: CalendarClock, roles: OWNER_AND_MANAGER },
        ],
    },
    {
        label: 'Клиентская база',
        items: [
            { href: routes.CLIENTS, label: 'Клиенты', icon: Users },
            { href: routes.EMPLOYEES, label: 'Сотрудники', icon: UserCog, roles: OWNER_ONLY },
            { href: routes.MY_BUSINESS, label: 'Бизнесы', icon: Building2, roles: OWNER_ONLY },
        ],
    },
    {
        label: 'Аналитика',
        items: [
            { href: routes.FINANCE, label: 'Финансы', icon: Wallet, roles: OWNER_AND_MANAGER },
            { href: routes.REVIEWS, label: 'Отзывы', icon: Star },
        ],
    },
    {
        label: 'Система',
        items: [
            { href: routes.SETTINGS, label: 'Настройки', icon: Settings, exact: true, roles: OWNER_ONLY },
            { href: routes.SETTINGS_API, label: 'API', icon: Code2, roles: OWNER_ONLY },
            { href: routes.INSTALL, label: 'Приложение', icon: Smartphone },
        ],
    },
];

// Видимые группы для роли: пункт без `roles` видят все; с `roles` — только
// перечисленные. Роль null (ещё не определена) — показываем только публичные.
// Пустые после фильтрации группы убираем.
export const getVisibleNavGroups = (role: UserRole | null): NavGroup[] =>
    navGroups
        .map((group) => ({
            ...group,
            items: group.items.filter(
                (item) => !item.roles || (role !== null && item.roles.includes(role)),
            ),
        }))
        .filter((group) => group.items.length > 0);

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
