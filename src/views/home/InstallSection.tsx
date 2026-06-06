'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Smartphone, Monitor, WifiOff, ArrowRight } from 'lucide-react';
import { Logo } from '@/ui/logo/Logo';
import { routes } from '@/routes/routes';

const points = [
    { icon: Smartphone, text: 'Иконка на домашнем экране телефона' },
    { icon: Monitor, text: 'Отдельное окно на компьютере' },
    { icon: WifiOff, text: 'Базовые экраны работают офлайн' },
];

export const InstallSection = () => (
    <section className="bg-gradient-to-b from-purple-950 to-black px-4 py-24">
        <motion.div
            className="mx-auto flex max-w-5xl flex-col items-center gap-10 rounded-3xl border border-purple-700/40 bg-gradient-to-br from-indigo-600/15 via-purple-600/10 to-pink-500/15 p-10 lg:flex-row lg:p-14"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
        >
            <div className="shrink-0">
                <Logo size={96} withWordmark={false} />
            </div>

            <div className="flex-1 text-center lg:text-left">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                    Mesto всегда под рукой
                </h2>
                <p className="mt-3 text-purple-200">
                    Установите приложение за 10 секунд — на телефон или компьютер. Без
                    магазинов приложений, прямо из браузера.
                </p>

                <ul className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap lg:items-start">
                    {points.map((p) => (
                        <li
                            key={p.text}
                            className="inline-flex items-center gap-2 text-sm text-purple-100"
                        >
                            <p.icon size={18} className="text-pink-400" />
                            {p.text}
                        </li>
                    ))}
                </ul>

                <Link
                    href={routes.INSTALL}
                    className="group mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-7 py-3.5 font-semibold text-white shadow-lg shadow-purple-900/40 transition hover:opacity-95"
                >
                    Как установить
                    <ArrowRight
                        size={18}
                        className="transition-transform group-hover:translate-x-0.5"
                    />
                </Link>
            </div>
        </motion.div>
    </section>
);
