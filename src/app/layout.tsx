import type {Metadata} from "next";
import "./globals.css";
import {Header} from "@/ui/header/Header";
import {Footer} from "@/ui/footer/Footer";
import {AuthProvider} from "@/context/AuthContext";
import {NotificationProvider} from "@/context/NotificationContext";

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
                <Header />
                {children}
                <Footer />
            </AuthProvider>
        </NotificationProvider>
        </body>
        </html>
    );
}
