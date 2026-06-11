'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useBusiness } from '@/contexts/BusinessContext';

interface BusinessSwitcherProps {
    // На всю ширину контейнера (для выдвижного меню), иначе компактный (шапка).
    fullWidth?: boolean;
}

// Переключатель текущего бизнеса. От него зависят все экраны
// (клиенты, календарь, сотрудники, финансы) — они читают currentBusiness.
export const BusinessSwitcher = ({ fullWidth = false }: BusinessSwitcherProps) => {
    const { businessesData, currentBusiness, setCurrentBusiness } = useBusiness();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (businessesData.length === 0) return null;

    const current = businessesData.find((b) => b.id === currentBusiness);
    const label = current?.name ?? 'Выберите бизнес';

    // Один бизнес — переключать нечего, показываем неинтерактивную плашку.
    if (businessesData.length === 1) {
        return (
            <span
                className={clsx(
                    'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-purple-200',
                    fullWidth ? 'w-full' : 'max-w-[10rem] sm:max-w-[14rem]',
                )}
            >
                <Building2 size={16} className="shrink-0 text-purple-400" />
                <span className="truncate">{label}</span>
            </span>
        );
    }

    const handleSelect = (id: string) => {
        setCurrentBusiness(id);
        setOpen(false);
    };

    return (
        <div ref={ref} className={clsx('relative', fullWidth && 'w-full')}>
            <button
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={clsx(
                    'flex cursor-pointer items-center gap-2 rounded-lg border border-purple-700/50 bg-purple-900/40 px-2.5 py-1.5 text-sm text-white transition hover:bg-purple-800/50',
                    fullWidth ? 'w-full' : 'max-w-[10rem] sm:max-w-[14rem]',
                )}
            >
                <Building2 size={16} className="shrink-0 text-purple-300" />
                <span className="truncate">{label}</span>
                <ChevronDown
                    size={16}
                    className={clsx('shrink-0 text-purple-400 transition', open && 'rotate-180')}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.ul
                        role="listbox"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className={clsx(
                            'absolute z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-purple-700/60 bg-purple-950/95 p-1.5 shadow-xl backdrop-blur',
                            fullWidth ? 'inset-x-0' : 'right-0 w-60',
                        )}
                    >
                        {businessesData.map((biz) => {
                            const active = biz.id === currentBusiness;
                            return (
                                <li key={biz.id}>
                                    <button
                                        role="option"
                                        aria-selected={active}
                                        onClick={() => handleSelect(biz.id)}
                                        className={clsx(
                                            'flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition',
                                            active
                                                ? 'bg-purple-600/30 text-white'
                                                : 'text-purple-200 hover:bg-purple-800/40 hover:text-white',
                                        )}
                                    >
                                        <span className="truncate">{biz.name}</span>
                                        {active && (
                                            <Check size={16} className="shrink-0 text-purple-300" />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};
