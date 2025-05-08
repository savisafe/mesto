import type {Metadata} from "next";
import "./globals.css";
import {Header} from "@/ui/header/Header";
import {Footer} from "@/ui/footer/Footer";
import {AuthProvider} from "@/contexts/AuthContext";
import {BusinessProvider} from "@/contexts/BusinessContext";
import {NotificationProvider} from "@/contexts/NotificationContext";

export const metadata: Metadata = {
    title: "Mesto CRM",
    description: "CRM-система для малого бизнеса",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ru" suppressHydrationWarning>
        <body className="antialiased">
        <NotificationProvider>
            <AuthProvider>
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
