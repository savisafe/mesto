'use client';

import { motion } from 'framer-motion';
import { Eye, Bot, TrendingUp, type LucideIcon } from 'lucide-react';

interface Pillar {
    icon: LucideIcon;
    title: string;
    text: string;
    gradient: string;
}

const pillars: Pillar[] = [
    {
        icon: Eye,
        title: 'Контроль',
        text: 'Записи, занятость сотрудников, клиенты и выручка — всё видно в реальном времени на одном экране.',
        gradient: 'from-indigo-500 to-indigo-700',
    },
    {
        icon: Bot,
        title: 'Автоматизация',
        text: 'Онлайн-запись 24/7 и автоматические напоминания берут рутину на себя — меньше звонков и пропусков.',
        gradient: 'from-purple-500 to-purple-700',
    },
    {
        icon: TrendingUp,
        title: 'Деньги',
        text: 'Прозрачный финансовый учёт и аналитика показывают, где вы зарабатываете и где теряете.',
        gradient: 'from-pink-500 to-pink-700',
    },
];

export const PillarsSection = () => (
    <section className="bg-black px-4 py-24">
        <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
                Три опоры вашего роста
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-purple-300">
                Тот же смысл, что и в нашем логотипе — линия, которая идёт вверх.
            </p>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
                {pillars.map((p, i) => (
                    <motion.div
                        key={p.title}
                        className="rounded-2xl border border-purple-800/60 bg-gradient-to-b from-purple-900/40 to-transparent p-8"
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <div
                            className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${p.gradient}`}
                        >
                            <p.icon size={26} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">{p.title}</h3>
                        <p className="mt-2 text-purple-300">{p.text}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    </section>
);
