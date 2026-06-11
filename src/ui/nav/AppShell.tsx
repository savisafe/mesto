'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes/routes';
import { Footer } from '@/ui/footer/Footer';
import { EmailVerifyBanner } from '@/ui/auth/EmailVerifyBanner';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { BottomNav } from './BottomNav';
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

    useEffect(() => {
        setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
    }, []);

    // Закрываем мобильное меню при переходе на другую страницу.
    useEffect(() => {
        setMobileNavOpen(false);
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
                <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
                <EmailVerifyBanner isTelegramEnabled={isTelegramEnabled} />
                {/* Снизу на мобильном — таб-панель (fixed), поэтому добавляем отступ,
                    чтобы контент не уезжал под неё. На desktop таб-панели нет. */}
                <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
                    {children}
                </main>
            </div>
            <BottomNav onOpenMore={() => setMobileNavOpen(true)} />
        </div>
    );
};
