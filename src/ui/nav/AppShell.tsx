'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes/routes';
import { Footer } from '@/ui/footer/Footer';
import { EmailVerifyBanner } from '@/ui/auth/EmailVerifyBanner';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Topbar } from './Topbar';
import { PublicHeader } from './PublicHeader';

// Публичные страницы показываются без рабочего сайдбара даже залогиненному.
const PUBLIC_ROUTES = new Set<string>([
    routes.HOME,
    routes.LOGIN,
    routes.LOGIN_OTP,
    routes.REGISTRATION,
]);

const COLLAPSE_STORAGE_KEY = 'mesto:nav-collapsed';

interface AppShellProps {
    children: React.ReactNode;
    isTelegramEnabled: boolean;
}

export const AppShell = ({ children, isTelegramEnabled }: AppShellProps) => {
    const { user } = useAuth();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    // Кнопку «Назад» показываем только когда внутри приложения уже была хотя бы
    // одна навигация — иначе router.back() увёл бы пользователя за пределы PWA.
    const navCountRef = useRef(0);
    const [canGoBack, setCanGoBack] = useState(false);

    useEffect(() => {
        setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
    }, []);

    // Закрываем мобильное меню при переходе на другую страницу и отмечаем,
    // что в истории появился предыдущий экран.
    useEffect(() => {
        setMobileNavOpen(false);
        navCountRef.current += 1;
        if (navCountRef.current > 1) setCanGoBack(true);
    }, [pathname]);

    const handleToggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
            return next;
        });
    };

    const showWorkspace = Boolean(user) && !PUBLIC_ROUTES.has(pathname);

    if (!showWorkspace) {
        return (
            <>
                <PublicHeader />
                <EmailVerifyBanner isTelegramEnabled={isTelegramEnabled} />
                {children}
                <Footer />
            </>
        );
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-purple-950 to-black text-white">
            <Sidebar collapsed={collapsed} onToggleCollapsed={handleToggleCollapsed} />
            <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} canGoBack={canGoBack} />
                <EmailVerifyBanner isTelegramEnabled={isTelegramEnabled} />
                <main className="flex-1">{children}</main>
            </div>
        </div>
    );
};
