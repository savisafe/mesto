'use client';

import { motion } from 'framer-motion';

const results = [
    { value: '+30%', label: 'повторных визитов за счёт напоминаний' },
    { value: '−5 ч', label: 'рутины в неделю — на автоматизации' },
    { value: '24/7', label: 'запись клиентов без вашего участия' },
    { value: '100%', label: 'прозрачность выручки и услуг' },
];

export const ResultsSection = () => (
    <section className="bg-purple-950 px-4 py-24">
        <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
                Что это даёт бизнесу
            </h2>

            <div className="mt-14 grid grid-cols-2 gap-6 lg:grid-cols-4">
                {results.map((r, i) => (
                    <motion.div
                        key={r.label}
                        className="text-center"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <p className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl">
                            {r.value}
                        </p>
                        <p className="mx-auto mt-3 max-w-[200px] text-sm text-purple-300">
                            {r.label}
                        </p>
                    </motion.div>
                ))}
            </div>

            <p className="mt-10 text-center text-xs text-purple-500">
                Ориентировочные показатели на основе типичных сценариев использования.
            </p>
        </div>
    </section>
);
