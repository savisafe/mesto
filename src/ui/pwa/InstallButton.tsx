'use client';

import { Download } from 'lucide-react';
import clsx from 'clsx';
import { usePwaInstall } from '@/hooks/usePwaInstall';

interface InstallButtonProps {
    className?: string;
}

export const InstallButton = ({ className }: InstallButtonProps) => {
    const { canInstall, promptInstall } = usePwaInstall();

    if (!canInstall) return null;

    return (
        <button
            onClick={promptInstall}
            className={clsx(
                'inline-flex items-center gap-1.5 cursor-pointer rounded-lg bg-purple-700 hover:bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white transition',
                className,
            )}
        >
            <Download size={16} />
            Установить
        </button>
    );
};
