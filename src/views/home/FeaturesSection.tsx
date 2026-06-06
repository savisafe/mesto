'use client';

import { motion } from 'framer-motion';
import {
    CalendarCheck,
    CalendarRange,
    Clock,
    Users,
    UserCog,
    LineChart,
    Star,
    Bell,
    Building2,
    Webhook,
    type LucideIcon,
} from 'lucide-react';

interface Feature {
    icon: LucideIcon;
    title: string;
    text: string;
}

const features: Feature[] = [
    {
        icon: CalendarCheck,
        title: 'Онлайн-запись 24/7',
        text: 'Клиенты записываются сами в любое время — без звонков и переписок.',
    },
    {
        icon: CalendarRange,
        title: 'Календарь записей',
        text: 'Наглядное расписание по дням и сотрудникам с проверкой пересечений.',
    },
    {
        icon: Clock,
        title: 'График работы',
        text: 'Гибкие смены сотрудников — система знает, кто и когда доступен.',
    },
    {
        icon: Users,
        title: 'База клиентов',
        text: 'История визитов, заметки и контакты — вся карточка клиента под рукой.',
    },
    {
        icon: UserCog,
        title: 'Сотрудники и роли',
        text: 'Приглашайте команду по email и настраивайте права доступа.',
    },
    {
        icon: LineChart,
        title: 'Финансы и аналитика',
        text: 'Выручка, услуги и динамика на дашборде — деньги как на ладони.',
    },
    {
        icon: Bell,
        title: 'Уведомления',
        text: 'Автонапоминания клиентам снижают неявки и пустые окна.',
    },
    {
        icon: Star,
        title: 'Отзывы',
        text: 'Собирайте оценки и репутацию, чтобы привлекать новых клиентов.',
    },
    {
        icon: Building2,
        title: 'Несколько бизнесов',
        text: 'Управляйте несколькими точками или брендами из одного аккаунта.',
    },
    {
        icon: Webhook,
        title: 'API и интеграции',
        text: 'Подключайте ботов и внешние сервисы через ключи доступа.',
    },
];

export const FeaturesSection = () => (
    <section id="features" className="bg-gradient-to-b from-black to-purple-950 px-4 py-24">
        <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
                Всё для работы — в одном месте
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-purple-300">
                От первой записи клиента до отчёта по выручке. Без десятка разрозненных
                сервисов и таблиц.
            </p>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((f, i) => (
                    <motion.div
                        key={f.title}
                        className="group rounded-2xl border border-purple-800/50 bg-purple-900/20 p-6 transition hover:border-purple-500/60 hover:bg-purple-900/40"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: (i % 3) * 0.08 }}
                    >
                        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-pink-500/20 text-purple-200 transition group-hover:from-indigo-500 group-hover:to-pink-500 group-hover:text-white">
                            <f.icon size={22} />
                        </div>
                        <h3 className="font-semibold text-white">{f.title}</h3>
                        <p className="mt-1.5 text-sm text-purple-300">{f.text}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    </section>
);
