'use client';

import { TrendingUp, Clock, XCircle, Receipt, Users, CalendarCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FinanceSummary } from '@/services/finance';
import { formatMoney } from './financeHelpers';

interface Props {
    summary: FinanceSummary;
    currency: string;
}

export function FinanceSummaryCards({ summary, currency }: Props) {
    const cards: { icon: LucideIcon; label: string; value: string; hint?: string; accent: string }[] = [
        {
            icon: TrendingUp,
            label: 'Выручка',
            value: formatMoney(summary.revenue, currency),
            hint: `${summary.completedCount} завершено`,
            accent: 'text-emerald-300',
        },
        {
            icon: Clock,
            label: 'Ожидается',
            value: formatMoney(summary.pending, currency),
            hint: `${summary.scheduledCount} запланировано`,
            accent: 'text-indigo-300',
        },
        {
            icon: Receipt,
            label: 'Средний чек',
            value: formatMoney(summary.avgCheck, currency),
            accent: 'text-purple-200',
        },
        {
            icon: Users,
            label: 'Клиенты',
            value: String(summary.clients),
            hint: 'с завершёнными записями',
            accent: 'text-purple-200',
        },
        {
            icon: CalendarCheck,
            label: 'Записи',
            value: String(
                summary.completedCount +
                    summary.scheduledCount +
                    summary.cancelledCount +
                    summary.noShowCount,
            ),
            hint: 'всего за период',
            accent: 'text-purple-200',
        },
        {
            icon: XCircle,
            label: 'Потери',
            value: formatMoney(summary.lost, currency),
            hint: `${summary.cancelledCount} отмен · ${summary.noShowCount} неявок`,
            accent: 'text-rose-300',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {cards.map((c) => (
                <div
                    key={c.label}
                    className="bg-white/5 border border-purple-700/40 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-2 text-purple-300 text-xs mb-2">
                        <c.icon size={15} className={c.accent} />
                        {c.label}
                    </div>
                    <p className="text-2xl font-bold text-white tracking-tight">{c.value}</p>
                    {c.hint && <p className="text-purple-400 text-xs mt-1">{c.hint}</p>}
                </div>
            ))}
        </div>
    );
}
