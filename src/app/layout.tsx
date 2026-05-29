import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/ui/header/Header';
import { Footer } from '@/ui/footer/Footer';
import { AuthProvider } from '@/contexts/AuthContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
    title: 'Mesto CRM',
    description: 'CRM-система для малого бизнеса',
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
