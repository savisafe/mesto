'use client';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    type ChartOptions,
    type TooltipItem,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import type { FinanceAnalytics } from '@/services/finance';
import { formatMoney } from './financeHelpers';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
);

const TEXT = 'rgba(216, 180, 254, 0.85)'; // purple-300
const GRID = 'rgba(168, 85, 247, 0.12)';

const scales = {
    x: { ticks: { color: TEXT, font: { size: 10 } }, grid: { color: GRID } },
    y: { ticks: { color: TEXT, font: { size: 10 } }, grid: { color: GRID }, beginAtZero: true },
};

interface Props {
    data: FinanceAnalytics;
}

export function FinanceCharts({ data }: Props) {
    const labels = data.series.map((p) => p.label);

    const revenueData = {
        labels,
        datasets: [
            {
                label: 'Выручка',
                data: data.series.map((p) => p.revenue),
                borderColor: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.15)',
                fill: true,
                tension: 0.3,
            },
            {
                label: 'Ожидается',
                data: data.series.map((p) => p.pending),
                borderColor: '#818cf8',
                backgroundColor: 'rgba(129, 140, 248, 0.1)',
                fill: true,
                tension: 0.3,
            },
        ],
    };

    const topEmployees = data.byEmployee.slice(0, 8);
    const employeeData = {
        labels: topEmployees.map((e) => e.name),
        datasets: [
            {
                label: 'Выручка',
                data: topEmployees.map((e) => e.revenue),
                backgroundColor: 'rgba(168, 85, 247, 0.6)',
                borderRadius: 6,
            },
        ],
    };

    const statusData = {
        labels: ['Завершено', 'Запланировано', 'Отменено', 'Неявки'],
        datasets: [
            {
                data: [
                    data.byStatus.completed,
                    data.byStatus.scheduled,
                    data.byStatus.cancelled,
                    data.byStatus.no_show,
                ],
                backgroundColor: ['#34d399', '#818cf8', '#fb7185', '#fbbf24'],
                borderWidth: 0,
            },
        ],
    };

    const currency = data.currency;
    const lineOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: TEXT, boxWidth: 12, font: { size: 11 } } },
            tooltip: {
                callbacks: {
                    label: (ctx: TooltipItem<'line'>) =>
                        `${ctx.dataset.label ?? ''}: ${formatMoney(ctx.parsed.y ?? 0, currency)}`,
                },
            },
        },
        scales,
    };

    const barOptions: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx: TooltipItem<'bar'>) =>
                        `${ctx.dataset.label ?? ''}: ${formatMoney(ctx.parsed.y ?? 0, currency)}`,
                },
            },
        },
        scales,
    };

    const doughnutOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: TEXT, font: { size: 11 } } } },
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Динамика выручки" className="lg:col-span-2">
                <Line data={revenueData} options={lineOptions} />
            </ChartCard>

            <ChartCard title="Статусы записей">
                <Doughnut data={statusData} options={doughnutOptions} />
            </ChartCard>

            <ChartCard title="Выручка по сотрудникам" className="lg:col-span-3">
                {topEmployees.length === 0 ? (
                    <EmptyChart />
                ) : (
                    <Bar data={employeeData} options={barOptions} />
                )}
            </ChartCard>
        </div>
    );
}

function ChartCard({
    title,
    className,
    children,
}: {
    title: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={`bg-white/5 border border-purple-700/40 rounded-2xl p-4 ${className ?? ''}`}>
            <h2 className="text-sm font-medium text-purple-200 mb-3">{title}</h2>
            <div className="h-64">{children}</div>
        </div>
    );
}

function EmptyChart() {
    return (
        <div className="h-full flex items-center justify-center text-purple-400 text-sm">
            Нет данных за период
        </div>
    );
}
