'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';

export default function HomePage() {
    const [form, setForm] = useState({ name: '', phone: '' });
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
    };

    return (
        <div className="space-y-32">
            {/* Hero */}
            <section className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-purple-950 to-black text-white text-center px-4">
                <motion.h1
                    className="text-4xl md:text-5xl font-bold mb-4"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                >
                    CRM для бизнеса с клиентами: просто, удобно, прозрачно
                </motion.h1>
                <motion.p
                    className="max-w-xl mb-8 text-lg text-purple-200"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    Онлайн-записи, сотрудники, финансы и уведомления — всё в одной платформе, заточенной под реальный бизнес.
                </motion.p>
                <motion.div
                    className="flex flex-col sm:flex-row gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <a href="#start" className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg shadow">Начать бесплатно</a>
                    <a href="#demo" className="px-6 py-3 bg-transparent border border-purple-600 hover:bg-purple-800 rounded-lg shadow">Получить демо</a>
                </motion.div>
            </section>

            {/* Features */}
            <section className="py-16 bg-white text-black px-4">
                <h2 className="text-3xl font-bold text-center mb-8">Что умеет Mesto.pro</h2>
                <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        'Онлайн-запись 24/7',
                        'Уведомления клиентам',
                        'Управление сотрудниками',
                        'Аналитика по выручке',
                        'История клиентов и заметки',
                        'Мобильная адаптация'
                    ].map((text, i) => (
                        <div key={i} className="p-6 bg-purple-50 rounded-lg shadow">
                            <p className="text-lg">✅ {text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Screenshots placeholder */}
            <section className="py-16 bg-gray-50 px-4">
                <h2 className="text-3xl font-extrabold text-center mb-8 text-gray-900">Интерфейс</h2>
                <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {['Календарь', 'Запись клиента', 'Финансы', 'Отзывы', 'Сотрудники', 'Уведомления'].map((label, i) => (
                        <div key={i} className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-center h-48 text-gray-700 font-medium">
                            {label}
                        </div>
                    ))}
                </div>
            </section>

            {/* Results */}
            <section className="py-16 bg-purple-950 text-white px-4">
                <h2 className="text-3xl font-bold text-center mb-8">Что вы получаете</h2>
                <div className="max-w-3xl mx-auto space-y-4 text-lg">
                    <p>📈 +30% возвратов за счёт напоминаний</p>
                    <p>🕒 До 5 часов в неделю — автоматизировано</p>
                    <p>📊 Прозрачный финансовый учёт</p>
                    <p>🙌 Меньше ошибок, больше довольных клиентов</p>
                </div>
            </section>

            {/* CTA */}
            <section id="start" className="py-16 bg-white text-center px-4">
                <h2 className="text-3xl font-extrabold text-center mb-4 text-gray-900">Готовы начать?</h2>
                <p className="text-gray-600 mb-6">Оставьте контакт — мы свяжемся и подключим вас к системе</p>
                {submitted ? (
                    <p className="text-green-600 font-semibold">Спасибо! Мы с вами свяжемся 🙌</p>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                        <input name="name" value={form.name} onChange={handleChange} placeholder="Имя" required
                               className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-black" />
                        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Телефон" required
                               className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-black" />
                        <button type="submit" className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white">Отправить</button>
                    </form>
                )}
            </section>
        </div>
    );
}
