import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/ui/header/Header";
import { Footer } from "@/ui/footer/Footer";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

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
        <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`}>
        <body className="antialiased">
        <AuthProvider>
            <Header />
            {children}
            <Footer />
        </AuthProvider>
        </body>
        </html>
    );
}
