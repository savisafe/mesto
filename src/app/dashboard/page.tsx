 'use client';

import {JSX, useEffect, useState} from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {useAuth} from "@/context/AuthContext";
 import {roles} from "@/types/types";
 import {supabase} from "../../../supabaseClient";


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
    const { accessToken, user } = useAuth();
    const admin = user?.role === roles.admin;

    const test = async () => {
        await supabase.from('businesses').select('*');
    }

    useEffect(() => {
        test()
    }, []);

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

    const [widgets, ] = useState<WidgetConfig[]>(Object.values(availableWidgets));

    return accessToken && admin && (
        <div className="min-h-screen p-6 bg-gradient-to-br from-purple-950 to-black text-white">
            <h1 className="text-3xl font-bold mb-6">Панель управления</h1>
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
            </motion.div>
        </div>
    );
}
