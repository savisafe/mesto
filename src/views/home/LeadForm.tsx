'use client';

import { useState, type FormEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { routes } from '@/routes/routes';

export const LeadForm = () => {
    const [form, setForm] = useState({ name: '', phone: '' });
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
    };

    return (
        <section id="start" className="bg-black px-4 py-24">
            <motion.div
                className="mx-auto max-w-2xl rounded-3xl border border-purple-700/40 bg-purple-900/30 p-8 text-center shadow-2xl backdrop-blur-md sm:p-12"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
            >
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                    Готовы навести порядок в бизнесе?
                </h2>
                <p className="mt-3 text-purple-200">
                    Начните бесплатно прямо сейчас или оставьте контакт — поможем с
                    запуском.
                </p>

                {submitted ? (
                    <p className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600/20 px-5 py-3 font-semibold text-emerald-300">
                        <CheckCircle2 size={20} />
                        Спасибо! Мы свяжемся с вами 🙌
                    </p>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        className="mt-8 flex flex-col gap-3 sm:flex-row"
                    >
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Имя"
                            required
                            className="flex-1 rounded-xl border border-purple-700/50 bg-purple-950/50 px-4 py-3 text-white placeholder-purple-400 outline-none focus:border-purple-400"
                        />
                        <input
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="Телефон"
                            required
                            className="flex-1 rounded-xl border border-purple-700/50 bg-purple-950/50 px-4 py-3 text-white placeholder-purple-400 outline-none focus:border-purple-400"
                        />
                        <button
                            type="submit"
                            className="rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-6 py-3 font-semibold text-white transition hover:opacity-95"
                        >
                            Отправить
                        </button>
                    </form>
                )}

                <p className="mt-6 text-sm text-purple-400">
                    Или{' '}
                    <Link
                        href={routes.REGISTRATION}
                        className="font-medium text-purple-200 underline-offset-4 hover:underline"
                    >
                        создайте аккаунт сами
                    </Link>{' '}
                    — это бесплатно.
                </p>
            </motion.div>
        </section>
    );
};
