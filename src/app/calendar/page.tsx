'use client';

import dayjs, { Dayjs } from 'dayjs';
import { useState, Fragment } from 'react';
import clsx from 'clsx';
import { Dialog, Transition } from '@headlessui/react';
import {useProtectedRoute} from "@/hooks/useProtectedRoute";
import {roles} from "@/types/types";

interface Appointment {
    time: string;
    client: string;
    service: string;
    phone: string;
    employee: string;
}

const employees = ['Дарья', 'Виктория', 'Елена'];

const clients: Record<string, Appointment[]> = {
    '2025-04-01': [
        { time: '12:00–12:30', client: 'Елена', service: 'Коррекция бровей', phone: '+77770000000', employee: 'Елена' },
        { time: '15:00–16:00', client: 'Зарина', service: 'ТРОЙНОЙ ОБЪЕМ', phone: '+77479896740', employee: 'Дарья' },
        { time: '17:00–19:00', client: 'Дарья', service: 'Окрашивание ресниц', phone: '+77447612239', employee: 'Виктория' },
    ],
    '2025-04-02': [
        { time: '10:00–11:00', client: 'Анна', service: 'Ламинирование ресниц', phone: '+77001231231', employee: 'Елена' }
    ]
};

export default function CalendarPage() {
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs('2025-04-01'));
    const [currentMonth, setCurrentMonth] = useState<Dayjs>(selectedDate.startOf('month'));
    const [selectedEmployee, setSelectedEmployee] = useState<string>('Дарья');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ time: '', client: '', service: '', phone: '' });

    const selectedDateStr = selectedDate.format('YYYY-MM-DD');
    const allAppointments = clients[selectedDateStr] || [];
    const dayAppointments = allAppointments.filter((appt) => appt.employee === selectedEmployee);

    const handleAddAppointment = () => {
        const key = selectedDate.format('YYYY-MM-DD');
        const newAppointment: Appointment = { ...formData, employee: selectedEmployee };
        clients[key] = [...(clients[key] || []), newAppointment];
        setIsModalOpen(false);
        setFormData({ time: '', client: '', service: '', phone: '' });
    };

    return (
        <div className="min-h-screen flex text-white bg-gradient-to-br from-purple-950 to-black">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />

                <main className="flex-1 p-6 overflow-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold">Расписание</h1>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl"
                        >
                            + Новая запись
                        </button>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-purple-300">Сотрудник:</span>
                        {employees.map((emp) => (
                            <button
                                key={emp}
                                onClick={() => setSelectedEmployee(emp)}
                                className={clsx(
                                    'px-3 py-1 rounded-full text-sm border transition',
                                    selectedEmployee === emp
                                        ? 'bg-purple-600 border-purple-500 text-white'
                                        : 'bg-purple-800 border-purple-600 text-purple-300 hover:bg-purple-700'
                                )}
                            >
                                {emp}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Calendar
                            currentMonth={currentMonth}
                            selectedDate={selectedDate}
                            selectedEmployee={selectedEmployee}
                            onSelectDate={setSelectedDate}
                            onChangeMonth={setCurrentMonth}
                        />

                        <div className="lg:col-span-2 bg-purple-900 bg-opacity-30 rounded-xl p-6 border border-purple-700">
                            <h2 className="text-xl font-semibold mb-4">
                                Записи на {selectedDate.format('DD MMMM YYYY')} ({selectedEmployee})
                            </h2>
                            <div className="space-y-4">
                                {dayAppointments.length === 0 ? (
                                    <p className="text-purple-300">Нет записей у сотрудника на выбранную дату.</p>
                                ) : (
                                    dayAppointments.map((appt, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 rounded-xl border border-purple-600 bg-purple-700 bg-opacity-40 hover:bg-purple-600 transition duration-300"
                                        >
                                            <p className="font-bold text-lg">{appt.time}</p>
                                            <p className="text-sm text-purple-200">{appt.service}</p>
                                            <p className="text-sm text-purple-300">{appt.client} — {appt.phone}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <AppointmentModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        formData={formData}
                        setFormData={setFormData}
                        onSubmit={handleAddAppointment}
                        selectedDate={selectedDate}
                        selectedEmployee={selectedEmployee}
                    />
                </main>
            </div>
        </div>
    );
}

function Sidebar() {
    return (
        <aside className="w-64 bg-purple-900 bg-opacity-30 backdrop-blur-md p-6 border-r border-purple-800 hidden md:flex flex-col justify-between">
            <div>
                <h2 className="text-2xl font-bold mb-6">CRM</h2>
                <nav className="space-y-4">
                    <a href="/dashboard" className="block text-purple-300 hover:text-white">Главная</a>
                    <a href="/dashboard/calendar" className="block text-purple-300 hover:text-white">Календарь</a>
                    <a href="/dashboard/clients" className="block text-purple-300 hover:text-white">Клиенты</a>
                    <a href="/dashboard/settings" className="block text-purple-300 hover:text-white">Настройки</a>
                </nav>
            </div>

            <div className="text-xs text-purple-400">
                <p>Дарья</p>
                <p>daria@example.com</p>
            </div>
        </aside>
    );
}

function Header() {
    return (
        <header className="w-full p-4 border-b border-purple-800 bg-purple-900 bg-opacity-20 backdrop-blur-md">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <h1 className="text-xl font-semibold">Календарь записи</h1>
                <div className="text-sm text-purple-300">Вы вошли как Дарья</div>
            </div>
        </header>
    );
}

function Calendar({ currentMonth, selectedDate, selectedEmployee, onSelectDate, onChangeMonth }: {
    currentMonth: Dayjs;
    selectedDate: Dayjs;
    selectedEmployee: string;
    onSelectDate: (date: Dayjs) => void;
    onChangeMonth: (date: Dayjs) => void;
}) {
    const startDate = currentMonth.startOf('week');
    const calendarDays = Array.from({ length: 42 }, (_, i) => startDate.add(i, 'day'));

    return (
        <div className="lg:col-span-1 bg-purple-800 bg-opacity-20 rounded-xl p-4 border border-purple-700">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => onChangeMonth(currentMonth.subtract(1, 'month'))} className="text-purple-300 hover:text-white">←</button>
                <span className="text-white font-semibold">{currentMonth.format('MMMM YYYY')}</span>
                <button onClick={() => onChangeMonth(currentMonth.add(1, 'month'))} className="text-purple-300 hover:text-white">→</button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm text-purple-300 mb-2">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
                    <div key={d} className="font-semibold">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date, i) => {
                    const isCurrentMonth = date.month() === currentMonth.month();
                    const isSelected = date.isSame(selectedDate, 'day');
                    const hasAppointments = (clients[date.format('YYYY-MM-DD')] || []).some(appt => appt.employee === selectedEmployee);

                    return (
                        <button
                            key={i}
                            onClick={() => onSelectDate(date)}
                            className={clsx(
                                'relative aspect-square text-sm rounded-lg transition p-2 flex flex-col items-center justify-center',
                                isSelected ? 'bg-purple-600 text-white' : 'text-purple-300 hover:bg-purple-700',
                                !isCurrentMonth && 'opacity-40'
                            )}
                        >
                            {date.date()}
                            {hasAppointments && <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1"></span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function AppointmentModal({ isOpen, onClose, formData, setFormData, onSubmit, selectedDate, selectedEmployee }: {
    isOpen: boolean;
    onClose: () => void;
    formData: { time: string; client: string; service: string; phone: string };
    setFormData: (v: { [p: string]: string; time: string; client: string; service: string; phone: string }) => void;
    onSubmit: () => void;
    selectedDate: Dayjs;
    selectedEmployee: string;
}) {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-purple-900 p-6 text-left align-middle shadow-xl transition-all border border-purple-700">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">
                                    Новая запись на {selectedDate.format('DD MMMM YYYY')} ({selectedEmployee})
                                </Dialog.Title>
                                <div className="mt-4 space-y-3">
                                    {['time', 'client', 'service', 'phone'].map((key) => (
                                        <input
                                            key={key}
                                            type="text"
                                            placeholder={key === 'time' ? 'Время (например: 14:00–15:00)' : key.charAt(0).toUpperCase() + key.slice(1)}
                                            className="w-full px-3 py-2 rounded-md bg-purple-800 text-white placeholder-purple-300"
                                            value={formData[key as keyof typeof formData]}
                                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                        />
                                    ))}
                                </div>
                                <div className="mt-6 flex justify-end gap-2">
                                    <button
                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white"
                                        onClick={onClose}
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md text-white"
                                        onClick={onSubmit}
                                    >
                                        Добавить
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}