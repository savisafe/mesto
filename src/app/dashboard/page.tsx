 'use client';

import {JSX, useState} from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {useAuth} from "@/context/AuthContext";


interface RecordEntry { time: string; client: string; master: string; }
interface EmployeeStatus { name: string; label: string; }
interface Review { rating: number; comment: string; client: string; }

interface WidgetConfig {
    id: string;
    title: string;
    content: JSX.Element;
    link: string | null;
    buttonText?: string;
}

export default function DashboardPage() {
    const { accessToken } = useAuth();

    // const today = new Date().toLocaleDateString('ru-RU');

    // Пример данных
    const recordsToday = 7;
    const revenueToday = 25000;
    const revenueWeek = 128000;
    const recentRecords: RecordEntry[] = [
        { time: '09:00', client: 'Дарья', master: 'Елена' },
        { time: '10:30', client: 'Зарина', master: 'Дарья' },
        { time: '12:00', client: 'Анна', master: 'Виктория' }
    ];
    const employeeActivity: EmployeeStatus[] = [
        { name: 'Анна', label: '🟢 В работе (13:00 – 14:00)' },
        { name: 'Виктор', label: '🕑 Свободен до 15:00' },
        { name: 'Оксана', label: '⛔ Сегодня выходной' }
    ];
    const recentReviews: Review[] = [
        { rating: 5, comment: 'Спасибо за шикарные брови!', client: 'Алина' },
        { rating: 4, comment: 'Отлично, но пришлось ждать.', client: 'Диана' }
    ];

    // Доступные виджеты (конфигурации)
    const availableWidgets: Record<string, WidgetConfig> = {
        records: {
            id: 'records',
            title: `Сегодня: ${recordsToday} записей`,
            content: (
                <>
                    <ul className="mt-4 space-y-1 text-sm">
                        {recentRecords.map((r, i) => (
                            <li key={i}>{r.time} — {r.client} ({r.master})</li>
                        ))}
                    </ul>
                </>
            ),
            link: '/calendar',
            buttonText: 'Перейти в календарь'
        },
        revenue: {
            id: 'revenue', title: 'Выручка за день / неделю',
            content: (
                <>
                    <p className="text-2xl font-bold">{revenueToday.toLocaleString()} ₸</p>
                    <p className="text-sm text-purple-300 mt-2">За неделю: {revenueWeek.toLocaleString()} ₸</p>
                </>
            ),
            link: '/finance', buttonText: 'Перейти в аналитику'
        },
        activity: {
            id: 'activity', title: 'Активность сотрудников',
            content: (
                <ul className="space-y-2 text-sm">
                    {employeeActivity.map((e, i) => (
                        <li key={i}>{e.name}: {e.label}</li>
                    ))}
                </ul>
            ),
            link: '/employees', buttonText: 'Перейти к сотрудникам'
        },
        reviews: {
            id: 'reviews', title: 'Отзывы клиентов',
            content: (
                <ul className="space-y-2 text-sm">
                    {recentReviews.map((rev, i) => (
                        <li key={i}>{'⭐'.repeat(rev.rating)} — {rev.client}: {rev.comment}</li>
                    ))}
                </ul>
            ),
            link: '/reviews', buttonText: 'Перейти к отзывам'
        },
        actions: {
            id: 'actions', title: 'Быстрые действия',
            content: (
                <div className="flex flex-col gap-3">
                    <Link href="/calendar"><button className="bg-purple-700 hover:bg-purple-600 rounded-xl px-4 py-2">+ Добавить запись</button></Link>
                    <Link href="/clients"><button className="bg-purple-700 hover:bg-purple-600 rounded-xl px-4 py-2">+ Добавить клиента</button></Link>
                    <Link href="/employees"><button className="bg-purple-700 hover:bg-purple-600 rounded-xl px-4 py-2">+ Добавить сотрудника</button></Link>
                </div>
            ), link: null
        }
    };

    // Состояние активных виджетов
    const [widgets, setWidgets] = useState<WidgetConfig[]>(Object.values(availableWidgets));
    const [isAdding, setIsAdding] = useState(false);

    const handleAddWidget = (id: string) => {
        const widget = availableWidgets[id];
        if (widgets.find(w => w.id === id)) return;
        setWidgets([...widgets, widget]);
        setIsAdding(false);
    };

    return accessToken && (
        <div className="min-h-screen p-6 bg-gradient-to-br from-purple-950 to-black text-white">
            <h1 className="text-3xl font-bold mb-6">Личный кабинет</h1>
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {widgets.map(widget => (
                    <div key={widget.id} className="bg-purple-800 min-h-60 bg-opacity-30 border border-purple-700 p-6 rounded-xl flex flex-col justify-between">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold mb-2">{widget.title}</h2>
                            {widget.content}
                        </div>
                        {widget.link && (
                            <Link href={widget.link}>
                                <button className="cursor-pointer w-full bg-purple-700 hover:bg-purple-600 py-2 rounded">
                                    {widget.buttonText}
                                </button>
                            </Link>
                        )}
                    </div>
                ))}

                {/* Добавить новый виджет */}
                <div className="bg-purple-800 bg-opacity-30 border border-purple-700 p-6 rounded-xl flex flex-col items-center justify-center">
                    {!isAdding ? (
                        <button onClick={() => setIsAdding(true)} className="flex items-center text-purple-300 hover:text-white">
                            <span className="text-4xl font-bold">＋</span><span className="ml-2 text-lg">Добавить виджет</span>
                        </button>
                    ) : (
                        <div className="space-y-2 w-full">
                            {Object.keys(availableWidgets).map(id => (
                                <button key={id} onClick={() => handleAddWidget(id)} className="w-full text-left px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded">
                                    {availableWidgets[id].title}
                                </button>
                            ))}
                            <button onClick={() => setIsAdding(false)} className="mt-2 w-full px-4 py-2 bg-red-600 hover:bg-red-500 rounded">
                                Отмена
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
