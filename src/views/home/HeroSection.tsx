'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Download,
    Sparkles,
    CalendarCheck,
    Wallet,
    Star,
} from 'lucide-react';
import { Logo } from '@/ui/logo/Logo';
import { routes } from '@/routes/routes';

const stats = [
    { label: 'Записей сегодня', value: '12' },
    { label: 'Выручка за день', value: '48 200' },
    { label: 'Загрузка', value: '87%' },
];

const upcoming = [
    { name: 'Анна К.', service: 'Стрижка и укладка', time: '10:30', tone: 'bg-pink-500' },
    { name: 'Игорь М.', service: 'Консультация', time: '12:00', tone: 'bg-indigo-500' },
    { name: 'Дарья В.', service: 'Маникюр', time: '14:15', tone: 'bg-purple-500' },
];

export const HeroSection = () => (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0b0117] via-purple-950 to-black px-4 pt-24 pb-28">
        {/* Декоративные градиентные пятна */}
        <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="pointer-events-none absolute top-20 -right-24 h-96 w-96 rounded-full bg-pink-600/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
            {/* Левая колонка — оффер */}
            <div className="text-center lg:text-left">
                <motion.span
                    className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-200"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Sparkles size={16} className="text-pink-400" />
                    CRM нового поколения для бизнеса с записью
                </motion.span>

                <motion.h1
                    className="mt-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                >
                    Бизнес под контролем,
                    <br />
                    на автопилоте,{' '}
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        в плюсе
                    </span>
                </motion.h1>

                <motion.p
                    className="mx-auto mt-6 max-w-xl text-lg text-purple-200 lg:mx-0"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    Онлайн-запись 24/7, расписание сотрудников, клиентская база, финансы и
                    аналитика. Mesto собирает весь ваш бизнес в одном месте — и считает
                    деньги за вас.
                </motion.p>

                <motion.div
                    className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:items-start"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                >
                    <Link
                        href={routes.REGISTRATION}
                        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-purple-900/40 transition hover:opacity-95 sm:w-auto"
                    >
                        Начать бесплатно
                        <ArrowRight
                            size={18}
                            className="transition-transform group-hover:translate-x-0.5"
                        />
                    </Link>
                    <Link
                        href={routes.INSTALL}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-purple-500/50 px-7 py-3.5 text-base font-semibold text-purple-100 transition hover:bg-purple-500/10 sm:w-auto"
                    >
                        <Download size={18} />
                        Установить приложение
                    </Link>
                </motion.div>

                <p className="mt-4 text-sm text-purple-400">
                    Без карты • запуск за 2 минуты • работает на телефоне и компьютере
                </p>
            </div>

            {/* Правая колонка — превью продукта */}
            <motion.div
                className="relative mx-auto w-full max-w-md"
                initial={{ opacity: 0, scale: 0.95, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
            >
                <div className="rounded-3xl border border-purple-700/40 bg-purple-900/40 p-5 shadow-2xl backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <Logo size={32} />
                        <span className="rounded-lg bg-purple-800/60 px-3 py-1 text-xs text-purple-200">
                            Сегодня
                        </span>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                        {stats.map((s) => (
                            <div
                                key={s.label}
                                className="rounded-xl bg-gradient-to-br from-purple-800/50 to-purple-900/40 p-3 text-center"
                            >
                                <p className="text-lg font-bold text-white">{s.value}</p>
                                <p className="mt-1 text-[11px] leading-tight text-purple-300">
                                    {s.label}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 space-y-2">
                        {upcoming.map((a) => (
                            <div
                                key={a.name}
                                className="flex items-center gap-3 rounded-xl bg-purple-800/30 p-2.5"
                            >
                                <span
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${a.tone}`}
                                >
                                    {a.name[0]}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-white">
                                        {a.name}
                                    </p>
                                    <p className="truncate text-xs text-purple-300">
                                        {a.service}
                                    </p>
                                </div>
                                <span className="text-sm font-semibold text-purple-200">
                                    {a.time}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Плавающие чипы */}
                <motion.div
                    className="absolute -left-5 top-10 hidden items-center gap-2 rounded-xl border border-purple-600/40 bg-purple-900/80 px-3 py-2 text-xs text-white shadow-lg backdrop-blur sm:flex"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <CalendarCheck size={16} className="text-emerald-400" />
                    Новая онлайн-запись
                </motion.div>
                <motion.div
                    className="absolute -right-4 bottom-12 hidden items-center gap-2 rounded-xl border border-purple-600/40 bg-purple-900/80 px-3 py-2 text-xs text-white shadow-lg backdrop-blur sm:flex"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.75 }}
                >
                    <Wallet size={16} className="text-pink-400" />
                    +4 500 к выручке
                </motion.div>
                <motion.div
                    className="absolute -right-3 top-2 hidden items-center gap-1 rounded-xl border border-purple-600/40 bg-purple-900/80 px-3 py-2 text-xs text-white shadow-lg backdrop-blur sm:flex"
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                >
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    4.9 — новый отзыв
                </motion.div>
            </motion.div>
        </div>
    </section>
);
