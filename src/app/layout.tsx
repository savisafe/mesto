import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/ui/header/Header';
import { Footer } from '@/ui/footer/Footer';
import { AuthProvider } from '@/contexts/AuthContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ServiceWorkerRegister } from '@/ui/pwa/ServiceWorkerRegister';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
    title: 'Mesto CRM',
    description: 'CRM-система для малого бизнеса',
    applicationName: 'Mesto',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Mesto',
    },
    icons: {
        icon: '/favicon.ico',
        apple: '/icons/apple-touch-icon.png',
    },
};

export const viewport: Viewport = {
    themeColor: '#4f46e5',
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();

    return (
        <html lang="ru" suppressHydrationWarning>
            <body className="antialiased">
                <ServiceWorkerRegister />
                <NotificationProvider>
                    <AuthProvider initialUser={user}>
                        <BusinessProvider>
                            <Header />
                            {children}
                            <Footer />
                        </BusinessProvider>
                    </AuthProvider>
                </NotificationProvider>
            </body>
        </html>
    );
}
