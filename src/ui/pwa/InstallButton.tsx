'use client';

import { useState } from 'react';
import { Download, Share, SquarePlus, PlusCircle } from 'lucide-react';
import clsx from 'clsx';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { Modal } from '@/ui/modal/Modal';

interface InstallButtonProps {
    className?: string;
}

export const InstallButton = ({ className }: InstallButtonProps) => {
    const { canPrompt, isStandalone, isIOS, promptInstall } = usePwaInstall();
    const [showIOSHelp, setShowIOSHelp] = useState(false);

    // Уже установлено или платформа не поддерживает установку — кнопку не показываем.
    if (isStandalone) return null;
    if (!canPrompt && !isIOS) return null;

    const handleClick = () => {
        if (canPrompt) {
            promptInstall();
        } else {
            setShowIOSHelp(true);
        }
    };

    return (
        <>
            <button
                onClick={handleClick}
                className={clsx(
                    'inline-flex items-center gap-1.5 cursor-pointer rounded-lg bg-purple-700 hover:bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white transition',
                    className,
                )}
            >
                <Download size={16} />
                Установить
            </button>

            <Modal
                open={showIOSHelp}
                onClose={() => setShowIOSHelp(false)}
                title="Установка на iPhone и iPad"
                size="sm"
            >
                <p className="mb-5 text-sm text-purple-200">
                    В Safari установите Mesto на домашний экран в три шага:
                </p>
                <ol className="space-y-4 text-sm text-purple-100">
                    <li className="flex items-start gap-3">
                        <Step n={1} />
                        <span className="flex flex-wrap items-center gap-1">
                            Нажмите кнопку «Поделиться»
                            <Share size={18} className="text-purple-300" />в панели Safari.
                        </span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Step n={2} />
                        <span className="flex flex-wrap items-center gap-1">
                            Выберите «На экран „Домой“»
                            <SquarePlus size={18} className="text-purple-300" />.
                        </span>
                    </li>
                    <li className="flex items-start gap-3">
                        <Step n={3} />
                        <span className="flex flex-wrap items-center gap-1">
                            Нажмите «Добавить»
                            <PlusCircle size={18} className="text-purple-300" />— иконка
                            появится на домашнем экране.
                        </span>
                    </li>
                </ol>
            </Modal>
        </>
    );
};

const Step = ({ n }: { n: number }) => (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
        {n}
    </span>
);
