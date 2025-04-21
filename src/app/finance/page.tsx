'use client';

import { useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Регистрация компонентов Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

interface Visit {
    date: string;
    client: string;
    employee: string;
    amount: number;
    paid: boolean;
}
interface Expense {
    date: string;
    amount: number;
}

const employees = ['Все', 'Дарья', 'Виктория', 'Елена'];

// Пример данных
const initialVisits: Visit[] = [
    { date: '2025-04-13', client: 'Ольга', employee: 'Дарья', amount: 6000, paid: true },
    { date: '2025-04-13', client: 'Ирина', employee: 'Елена', amount: 3500, paid: false },
    { date: '2025-04-14', client: 'Екатерина', employee: 'Елена', amount: 4500, paid: true },
    { date: '2025-04-15', client: 'Алина', employee: 'Дарья', amount: 5000, paid: true },
    { date: '2025-04-15', client: 'Мария', employee: 'Виктория', amount: 4000, paid: false }
];
const initialExpenses: Expense[] = [
    { date: '2025-04-13', amount: 2000 },
    { date: '2025-04-14', amount: 1500 },
    { date: '2025-04-15', amount: 2500 }
];

export default function FinancePage() {
    const [visits] = useState<Visit[]>(initialVisits);
    const [expenses] = useState<Expense[]>(initialExpenses);
    const [filterEmployee, setFilterEmployee] = useState('Все');
    const [fromDate, setFromDate] = useState('2025-04-13');
    const [toDate, setToDate] = useState('2025-04-15');

    // Фильтрация визитов по сотруднику и дате
    const filteredVisits = visits.filter(v =>
        (filterEmployee === 'Все' || v.employee === filterEmployee) &&
        v.date >= fromDate && v.date <= toDate
    );
    // Фильтрация расходов по дате
    const filteredExpenses = expenses.filter(e => e.date >= fromDate && e.date <= toDate);

    // Выручка по дням
    const revenueByDate: Record<string, number> = {};
    filteredVisits.forEach(v => {
        if (!revenueByDate[v.date]) revenueByDate[v.date] = 0;
        if (v.paid) revenueByDate[v.date] += v.amount;
    });
    const dates = Array.from(new Set([...Object.keys(revenueByDate), ...filteredExpenses.map(e => e.date)])).sort();
    const revenueData = dates.map(d => revenueByDate[d] || 0);

    // Расходы по дням
    const expenseByDate: Record<string, number> = {};
    filteredExpenses.forEach(e => {
        expenseByDate[e.date] = (expenseByDate[e.date] || 0) + e.amount;
    });
    const expenseData = dates.map(d => expenseByDate[d] || 0);

    // Чистая прибыль = выручка - расходы
    const netData = dates.map((d, i) => revenueData[i] - expenseData[i]);

    // Данные для графиков
    const lineChartData = {
        labels: dates,
        datasets: [
            { label: 'Выручка', data: revenueData, borderColor: '#8884d8', backgroundColor: 'rgba(136,132,216,0.2)' }
        ]
    };
    const barChartData = {
        labels: dates,
        datasets: [
            { label: 'Расходы', data: expenseData, backgroundColor: 'rgba(255,99,132,0.5)' }
        ]
    };
    const pieChartData = {
        labels: ['Оплачено', 'Не оплачено'],
        datasets: [
            {
                data: [
                    filteredVisits.filter(v => v.paid).length,
                    filteredVisits.filter(v => !v.paid).length
                ],
                backgroundColor: ['#82ca9d', '#ffcc00']
            }
        ]
    };
    const netChartData = {
        labels: dates,
        datasets: [
            { label: 'Чистая прибыль', data: netData, borderColor: '#00C49F', backgroundColor: 'rgba(0,196,159,0.2)' }
        ]
    };

    // Кол-во клиентов за период
    const clientCount = new Set(filteredVisits.map(v => v.client)).size;

    // CSV экспорт/импорт аналогично прежнему
    const handleExport = () => { /* ... */ };
    const handleImport = () => { /* ... */ };

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-purple-950 to-black text-white">
            <h1 className="text-3xl font-bold mb-6">Финансы</h1>

            {/* Фильтры */}
            <div className="flex flex-wrap gap-4 items-center mb-6">
                <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="px-3 py-2 rounded bg-purple-800 text-white">
                    {employees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                </select>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-3 py-2 rounded bg-purple-800 text-white" />
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="px-3 py-2 rounded bg-purple-800 text-white" />
                <button onClick={handleExport} className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-xl">Экспорт CSV</button>
                <label className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-xl cursor-pointer">
                    Импорт CSV<input type="file" accept="text/csv" onChange={handleImport} className="hidden" />
                </label>
            </div>

            {/* Графики */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Линейный выручки и чистой прибыли */}
                <div className="bg-purple-800 bg-opacity-30 p-4 rounded-xl border border-purple-700">
                    <h2 className="mb-2">Выручка и чистая прибыль</h2>
                    <Line data={{
                        labels: dates,
                        datasets: [
                            lineChartData.datasets[0],
                            netChartData.datasets[0]
                        ]
                    }} options={{ responsive: true }} />
                </div>
                {/* Столбчатый расходы */}
                <div className="bg-purple-800 bg-opacity-30 p-4 rounded-xl border border-purple-700">
                    <h2 className="mb-2">Расходы по дням</h2>
                    <Bar data={barChartData} options={{ responsive: true }} />
                </div>
            </div>
            {/* Круговая и статистика */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-purple-800 bg-opacity-30 p-4 rounded-xl border border-purple-700">
                    <h2 className="mb-2">Статус оплаты визитов</h2>
                    <Pie data={pieChartData} options={{ responsive: true }} />
                </div>
                <div className="bg-purple-800 bg-opacity-30 p-4 rounded-xl border border-purple-700">
                    <h2 className="font-semibold mb-2">Кол-во клиентов</h2>
                    <p>{clientCount}</p>
                </div>
            </div>
        </div>
    );
}
