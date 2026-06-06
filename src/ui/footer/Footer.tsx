import Link from 'next/link';
import { routes } from '@/routes/routes';

export function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="w-full py-6 border-t border-purple-800 text-center text-sm text-purple-400 bg-purple-950 bg-opacity-20">
            <p>Mesto — CRM-система для бизнеса © {year}</p>
            <p className="mt-1">Связь: support@mesto.pro</p>
            <Link
                href={routes.INSTALL}
                className="mt-2 inline-block text-purple-300 hover:text-white transition"
            >
                Установить приложение
            </Link>
        </footer>
    );
}
