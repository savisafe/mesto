'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { CalendarRange } from 'lucide-react';
import { Modal } from '@/ui/modal/Modal';
import { DateField } from '@/ui/form';
import type { FinanceGranularity } from '@/services/finance';
import { presetRange, formatRangeLabel, type DateRange } from './financeHelpers';

const PRESETS: { value: Exclude<FinanceGranularity, 'custom'>; label: string }[] = [
    { value: 'day', label: 'День' },
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'year', label: 'Год' },
];

interface Props {
    granularity: FinanceGranularity;
    range: DateRange;
    onChange: (granularity: FinanceGranularity, range: DateRange) => void;
}

export function PeriodSwitcher({ granularity, range, onChange }: Props) {
    const [customOpen, setCustomOpen] = useState(false);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-white/5 border border-purple-700/40 p-1">
                {PRESETS.map((p) => (
                    <button
                        key={p.value}
                        onClick={() => onChange(p.value, presetRange(p.value))}
                        className={clsx(
                            'px-3.5 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition',
                            granularity === p.value
                                ? 'bg-purple-600 text-white'
                                : 'text-purple-200 hover:text-white',
                        )}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <button
                onClick={() => setCustomOpen(true)}
                className={clsx(
                    'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border cursor-pointer transition',
                    granularity === 'custom'
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-white/5 border-purple-700/40 text-purple-200 hover:text-white',
                )}
            >
                <CalendarRange size={16} />
                {granularity === 'custom' ? formatRangeLabel(range) : 'Период'}
            </button>

            <CustomRangeDialog
                open={customOpen}
                initial={range}
                onClose={() => setCustomOpen(false)}
                onApply={(r) => {
                    onChange('custom', r);
                    setCustomOpen(false);
                }}
            />
        </div>
    );
}

function CustomRangeDialog({
    open,
    initial,
    onClose,
    onApply,
}: {
    open: boolean;
    initial: DateRange;
    onClose: () => void;
    onApply: (range: DateRange) => void;
}) {
    const [from, setFrom] = useState(initial.fromDate);
    const [to, setTo] = useState(initial.toDate);
    const [error, setError] = useState('');

    const handleApply = () => {
        if (!from || !to) {
            setError('Укажите обе даты');
            return;
        }
        if (from > to) {
            setError('Дата начала позже даты конца');
            return;
        }
        setError('');
        onApply({ fromDate: from, toDate: to });
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Свой период"
            size="sm"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-purple-200 hover:text-white text-sm cursor-pointer"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleApply}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-medium cursor-pointer transition"
                    >
                        Применить
                    </button>
                </>
            }
        >
            <DateField label="С" value={from} onChange={setFrom} max={to || undefined} />
            <DateField label="По" value={to} onChange={setTo} min={from || undefined} />
            {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </Modal>
    );
}
