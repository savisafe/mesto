'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    /** Если задан — рендерится в липкой плашке снизу (обычно primary/secondary кнопки) */
    footer?: ReactNode;
    /** Ширина модалки на десктопе */
    size?: ModalSize;
    /** Запрещает клик по бэкдропу закрывать модалку (для форм с несохранёнными данными) */
    closeOnBackdrop?: boolean;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-2xl',
};

/**
 * Унифицированная модалка для диалогов.
 *
 * Особенности:
 * - Скроллится сама когда контент длинный, не ломает viewport
 * - Sticky header (с X) + sticky footer (если задан); body скроллится
 * - Закрывается по Esc и клику по бэкдропу (можно отключить)
 * - Блокирует scroll body пока открыта
 * - На мобиле растягивается на весь экран
 *
 * Для всей страницы-как-форма (Login/Registration) используйте Popup,
 * это другой кейс (не диалог, а лендинг-карточка).
 */
export function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeOnBackdrop = true,
}: ModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Держим свежую ссылку на onClose, чтобы эффект ниже зависел только от `open`.
    // Иначе инлайновый onClose из родителя меняет идентичность на каждый рендер,
    // эффект перезапускается на каждое нажатие клавиши и крадёт фокус у поля ввода.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!open) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCloseRef.current();
        };
        document.addEventListener('keydown', onKey);

        // Блокируем скролл body, но не дёргаем layout если он уже был заблокирован
        // (на случай вложенных модалок — маловероятно, но не помешает).
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Фокус в модалку — для Tab/Esc и для VoiceOver. Но не перехватываем фокус,
        // если он уже внутри (например, поле с autoFocus уже его получило).
        if (dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
            dialogRef.current.focus();
        }

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open]);

    if (typeof window === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex sm:items-center items-stretch justify-center sm:p-4">
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={closeOnBackdrop ? onClose : undefined}
                        aria-hidden
                    />

                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        tabIndex={-1}
                        className={`relative w-full ${SIZE_CLASSES[size]} sm:max-h-[90vh] max-h-screen flex flex-col bg-purple-900/90 backdrop-blur-md border border-purple-700/50 sm:rounded-2xl shadow-2xl outline-none`}
                        initial={{ opacity: 0, scale: 0.97, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 12 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-purple-700/40">
                            <h2 className="text-xl font-semibold text-white tracking-tight">
                                {title}
                            </h2>
                            <button
                                onClick={onClose}
                                aria-label="Закрыть"
                                className="text-purple-300 hover:text-white p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

                        {footer && (
                            <footer className="flex justify-end gap-2 px-6 py-4 border-t border-purple-700/40">
                                {footer}
                            </footer>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
