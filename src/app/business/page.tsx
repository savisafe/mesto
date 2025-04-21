'use client';

import { useState } from 'react';
import Image from 'next/image';
import dayjs from 'dayjs';
import {useProtectedRoute} from "@/hooks/useProtectedRoute";
import {roles} from "@/types/types";

const availableDates = ['2025-04-22', '2025-04-25', '2025-04-27', '2025-04-28', '2025-04-30'];

const today = dayjs();
const currentMonth = today.startOf('month');
const daysInMonth = currentMonth.daysInMonth();
const startWeekday = currentMonth.day();
const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const employees = [
    {
        id: 1,
        name: 'Дарья',
        role: 'Бровист',
        services: [
            { name: 'Коррекция бровей', price: 3000 },
            { name: 'Окрашивание хной', price: 3500 },
        ],
        reviews: [
            { rating: 5, text: 'Очень аккуратно, брови 🔥' },
            { rating: 4, text: 'Немного подождала, но результат супер' },
        ],
    },
    {
        id: 2,
        name: 'Виктория',
        role: 'Лешмейкер',
        services: [
            { name: 'Классическое наращивание', price: 5000 },
            { name: '2D объём', price: 6000 },
        ],
        reviews: [
            { rating: 5, text: 'Самые красивые ресницы 😍' },
            { rating: 5, text: 'Спасибо, держатся долго!' },
        ],
    },
];

export default function BusinessPage() {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', email: '', service: '' });
    const [confirmed, setConfirmed] = useState(false);
    const [records, setRecords] = useState<
        { date: string; name: string; email: string; service: string }[]
    >([]);

    const generateCalendar = () => {
        const slots = [];
        const padding = (startWeekday + 6) % 7;
        for (let i = 0; i < padding; i++) slots.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            slots.push(dayjs(currentMonth).date(d));
        }
        return slots;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate) return;
        setRecords(prev => [...prev, { ...form, date: selectedDate }]);
        setConfirmed(true);
        setForm({ name: '', email: '', service: '' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-950 to-black text-white p-6 space-y-12">
            {/* Логотип + описание */}
            <div className="space-y-4 max-w-3xl mx-auto">
                <div className="flex items-center gap-4">
                    <Image src="/logo.png" alt="Логотип" width={72} height={72} className="rounded-lg" />
                    <div>
                        <h1 className="text-3xl font-bold">Mesto Beauty</h1>
                        <p className="text-purple-300 text-sm">Студия бровей и ресниц в Алматы</p>
                    </div>
                </div>
                <p className="text-purple-200 leading-relaxed">
                    Добро пожаловать в <strong>Mesto Beauty</strong> — студию, где каждому клиенту уютно и
                    спокойно. Услуги от лучших мастеров города: брови, ресницы и не только. Запишитесь онлайн
                    за пару кликов.
                </p>
            </div>

            {/* Календарь */}
            <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-semibold mb-4 text-center">Выберите дату записи</h2>
                <div className="bg-purple-800 bg-opacity-30 p-4 rounded-xl border border-purple-700">
                    <div className="grid grid-cols-7 text-center text-sm mb-2 text-purple-300">
                        {weekDays.map(day => (
                            <div key={day}>{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {generateCalendar().map((day, idx) => {
                            const dateStr = day?.format('YYYY-MM-DD');
                            const isAvailable = availableDates.includes(dateStr || '');
                            const isSelected = selectedDate === dateStr;
                            return (
                                <div key={idx}>
                                    {day ? (
                                        <button
                                            onClick={() => isAvailable && setSelectedDate(dateStr!)}
                                            className={`w-full aspect-square rounded-lg text-sm transition
                        ${
                                                isAvailable
                                                    ? isSelected
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-purple-700 hover:bg-purple-600 text-white'
                                                    : 'bg-purple-700 bg-opacity-20 text-purple-400 cursor-default'
                                            }`}
                                        >
                                            {day.date()}
                                        </button>
                                    ) : (
                                        <div />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {selectedDate && (
                        <p className="mt-4 text-sm text-purple-200 text-center">
                            Вы выбрали: <strong>{dayjs(selectedDate).format('DD MMMM YYYY')}</strong>
                        </p>
                    )}
                </div>
            </div>

            {/* Сотрудники */}
            <div className="space-y-8 max-w-5xl mx-auto">
                <h2 className="text-2xl font-semibold text-center mb-6">Выберите мастера</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {employees.map(emp => (
                        <div
                            key={emp.id}
                            className="bg-purple-800 bg-opacity-30 p-6 rounded-xl border border-purple-700"
                        >
                            <h3 className="text-xl font-bold mb-1">{emp.name}</h3>
                            <p className="text-purple-300 text-sm mb-4">{emp.role}</p>
                            <div className="mb-4">
                                <h4 className="font-semibold mb-2">Услуги:</h4>
                                <ul className="space-y-1">
                                    {emp.services.map((s, i) => (
                                        <li key={i} className="flex justify-between text-purple-200 text-sm">
                                            <span>• {s.name}</span>
                                            <span>{s.price} ₸</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Отзывы:</h4>
                                <ul className="space-y-2 text-sm text-purple-300">
                                    {emp.reviews.map((r, i) => (
                                        <li key={i} className="bg-purple-900 bg-opacity-50 p-2 rounded-lg">
                                            <span className="text-yellow-400">{"★".repeat(r.rating)}</span>
                                            <span className="ml-2 italic">{r.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Форма записи */}
            <div className="max-w-lg mx-auto bg-purple-800 bg-opacity-30 border border-purple-700 rounded-xl p-6 space-y-6 mt-12">
                <h2 className="text-2xl font-semibold text-center">Запись на приём</h2>
                {confirmed ? (
                    <div className="text-center space-y-4">
                        <p className="text-purple-200">
                            ✅ Мы отправили подтверждение на <strong>{records.at(-1)?.email}</strong>.
                        </p>
                        <p className="text-purple-300">Спасибо за запись!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-purple-300">
                            Дата: <strong>{selectedDate || 'не выбрана'}</strong>
                        </p>
                        <input
                            type="text"
                            required
                            placeholder="Ваше имя"
                            className="w-full px-4 py-2 rounded bg-purple-900 text-white placeholder-purple-400"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                        <input
                            type="email"
                            required
                            placeholder="Email для подтверждения"
                            className="w-full px-4 py-2 rounded bg-purple-900 text-white placeholder-purple-400"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                        <select
                            required
                            className="w-full px-4 py-2 rounded bg-purple-900 text-white"
                            value={form.service}
                            onChange={e => setForm({ ...form, service: e.target.value })}
                        >
                            <option value="" disabled>
                                Выберите услугу
                            </option>
                            {employees.flatMap(emp => emp.services).map((s, i) => (
                                <option key={i} value={s.name}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="w-full py-2 bg-purple-700 hover:bg-purple-600 rounded-lg font-semibold"
                        >
                            Записаться
                        </button>
                    </form>
                )}
                {records.length > 0 && (
                    <div className="mt-8 border-t border-purple-700 pt-4">
                        <h3 className="text-lg font-semibold mb-2">📋 Ваши записи</h3>
                        <ul className="space-y-2 text-sm text-purple-200">
                            {records.map((r, i) => (
                                <li key={i} className="bg-purple-900 bg-opacity-50 p-3 rounded-lg">
                                    <p>📅 {r.date}</p>
                                    <p>💇 {r.service}</p>
                                    <p>📧 {r.email}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Карта + кнопки */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto items-start">
                <div className="w-full aspect-square rounded-xl overflow-hidden border border-purple-700">
                    <iframe
                        className="w-full h-full"
                        src="https://yandex.kz/map-widget/v1/?ll=76.92848%2C43.238949&z=14&text=Алматы%20Mesto%20Beauty"
                        frameBorder="0"
                        allowFullScreen
                        title="Карта"
                    />
                </div>
                <div className="flex flex-col gap-4 w-full">
                    <a
                        href="https://yandex.kz/maps/?text=Алматы%20Mesto%20Beauty"
                        target="_blank"
                        className="bg-purple-700 hover:bg-purple-600 px-4 py-3 rounded-lg w-full text-center"
                    >
                        📍 Построить маршрут
                    </a>
                    <a
                        href="https://taxi.yandex.kz/"
                        target="_blank"
                        className="bg-purple-700 hover:bg-purple-600 px-4 py-3 rounded-lg w-full text-center"
                    >
                        🚕 Заказать такси
                    </a>
                </div>
            </div>
        </div>
    );
}
