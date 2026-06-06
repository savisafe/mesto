import type { Metadata } from 'next';
import InstallPage from '@/views/InstallPage';

export const metadata: Metadata = {
    title: 'Установить приложение — Mesto',
    description:
        'Установите Mesto как приложение на Android, iPhone, iPad или компьютер — пошаговая инструкция.',
};

export default function Page() {
    return <InstallPage />;
}
