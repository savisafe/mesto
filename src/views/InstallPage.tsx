'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
    Download,
    Share,
    SquarePlus,
    PlusCircle,
    MonitorDown,
    MoreVertical,
    Smartphone,
    Apple,
    Monitor,
    WifiOff,
    Zap,
    Maximize,
    CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';
import { Logo } from '@/ui/logo/Logo';
import { usePwaInstall } from '@/hooks/usePwaInstall';

type PlatformId = 'android' | 'ios' | 'desktop';

interface PlatformCard {
    id: PlatformId;
    title: string;
    icon: ReactNode;
    steps: ReactNode[];
}

const benefits = [
    {
        icon: <Zap className="text-purple-300" size={26} />,
        title: 'Запуск в один тап',
        text: 'Иконка Mesto прямо на домашнем экране — без поиска вкладки в браузере.',
    },
    {
        icon: <Maximize className="text-purple-300" size={26} />,
        title: 'На весь экран',
        text: 'Открывается как нативное приложение, без адресной строки и панелей.',
    },
    {
        icon: <WifiOff className="text-purple-300" size={26} />,
        title: 'Работает офлайн',
        text: 'Базовые экраны доступны даже при пропавшем интернете.',
    },
];

const platforms: PlatformCard[] = [
    {
        id: 'android',
        title: 'Android',
        icon: <Smartphone size={22} />,
        steps: [
            <>Откройте Mesto в браузере <b>Chrome</b>.</>,
            <>
                Нажмите кнопку <b>«Установить»</b> ниже либо меню{' '}
                <MoreVertical size={16} className="inline align-text-bottom text-purple-300" />{' '}
                → <b>«Установить приложение»</b>.
            </>,
            <>Подтвердите — иконка появится на главном экране.</>,
        ],
    },
    {
        id: 'ios',
        title: 'iPhone и iPad',
        icon: <Apple size={22} />,
        steps: [
            <>Откройте Mesto в браузере <b>Safari</b>.</>,
            <>
                Нажмите <b>«Поделиться»</b>{' '}
                <Share size={16} className="inline align-text-bottom text-purple-300" /> в
                панели браузера.
            </>,
            <>
                Выберите <b>«На экран „Домой“»</b>{' '}
                <SquarePlus size={16} className="inline align-text-bottom text-purple-300" />.
            </>,
            <>
                Нажмите <b>«Добавить»</b>{' '}
                <PlusCircle size={16} className="inline align-text-bottom text-purple-300" />.
            </>,
        ],
    },
    {
        id: 'desktop',
        title: 'Компьютер',
        icon: <Monitor size={22} />,
        steps: [
            <>Откройте Mesto в <b>Chrome</b> или <b>Edge</b>.</>,
            <>
                Нажмите значок установки{' '}
                <MonitorDown size={16} className="inline align-text-bottom text-purple-300" />{' '}
                справа в адресной строке (или кнопку <b>«Установить»</b> ниже).
            </>,
            <>Подтвердите <b>«Установить»</b> — Mesto откроется в отдельном окне.</>,
        ],
    },
];

export default function InstallPage() {
    const { canPrompt, isStandalone, isIOS, isAndroid, promptInstall } = usePwaInstall();

    const highlighted: PlatformId = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-950 to-black text-white px-4 py-16">
            <div className="mx-auto max-w-5xl">
                {/* Hero */}
                <motion.section
                    className="flex flex-col items-center text-center"
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Logo size={88} withWordmark={false} />
                    <h1 className="mt-6 text-3xl md:text-4xl font-bold">
                        Установите приложение Mesto
                    </h1>
                    <p className="mt-3 max-w-xl text-purple-200">
                        Быстрый доступ к записям, клиентам и финансам прямо с домашнего
                        экрана — как полноценное приложение.
                    </p>

                    <div className="mt-8">
                        {isStandalone ? (
                            <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-600/20 px-5 py-3 font-semibold text-emerald-300">
                                <CheckCircle2 size={20} />
                                Приложение уже установлено
                            </span>
                        ) : canPrompt ? (
                            <button
                                onClick={promptInstall}
                                className="inline-flex items-center gap-2 cursor-pointer rounded-xl bg-purple-600 hover:bg-purple-500 px-6 py-3 text-lg font-semibold shadow-lg transition"
                            >
                                <Download size={22} />
                                Установить сейчас
                            </button>
                        ) : (
                            <p className="text-sm text-purple-300">
                                Выберите вашу платформу ниже — мы подсветили подходящую.
                            </p>
                        )}
                    </div>
                </motion.section>

                {/* Benefits */}
                <section className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {benefits.map((b, i) => (
                        <motion.div
                            key={b.title}
                            className="rounded-2xl border border-purple-800/60 bg-purple-900/30 p-6"
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <div className="mb-3">{b.icon}</div>
                            <h3 className="font-semibold">{b.title}</h3>
                            <p className="mt-1 text-sm text-purple-300">{b.text}</p>
                        </motion.div>
                    ))}
                </section>

                {/* Platform instructions */}
                <section className="mt-20">
                    <h2 className="text-center text-2xl font-bold">Пошаговая инструкция</h2>
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {platforms.map((p) => (
                            <PlatformInstructions
                                key={p.id}
                                platform={p}
                                highlighted={p.id === highlighted}
                                action={
                                    p.id !== 'ios' && canPrompt && !isStandalone ? (
                                        <button
                                            onClick={promptInstall}
                                            className="mt-5 inline-flex w-full items-center justify-center gap-2 cursor-pointer rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-semibold transition"
                                        >
                                            <Download size={16} />
                                            Установить
                                        </button>
                                    ) : null
                                }
                            />
                        ))}
                    </div>
                </section>

                <p className="mt-12 text-center text-xs text-purple-400">
                    Установка доступна по защищённому соединению (HTTPS). На iOS установка
                    выполняется вручную через Safari — это ограничение Apple.
                </p>
            </div>
        </main>
    );
}

interface PlatformInstructionsProps {
    platform: PlatformCard;
    highlighted: boolean;
    action: ReactNode;
}

const PlatformInstructions = ({
    platform,
    highlighted,
    action,
}: PlatformInstructionsProps) => (
    <div
        className={clsx(
            'flex flex-col rounded-2xl border bg-purple-900/30 p-6 transition',
            highlighted
                ? 'border-purple-400 ring-2 ring-purple-500/40'
                : 'border-purple-800/60',
        )}
    >
        <div className="flex items-center gap-2 text-purple-200">
            {platform.icon}
            <h3 className="text-lg font-semibold text-white">{platform.title}</h3>
            {highlighted && (
                <span className="ml-auto rounded-full bg-purple-600 px-2 py-0.5 text-xs font-medium">
                    Ваше устройство
                </span>
            )}
        </div>

        <ol className="mt-4 space-y-3 text-sm text-purple-100">
            {platform.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold">
                        {i + 1}
                    </span>
                    <span>{step}</span>
                </li>
            ))}
        </ol>

        {action}
    </div>
);
