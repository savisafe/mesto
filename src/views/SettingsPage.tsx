'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface Integration { name: string; url: string; }

enum TariffPlan { Basic = 'Basic', Pro = 'Pro', Enterprise = 'Enterprise' }

export default function SettingsPage() {
    // Studio info
    const [studioName, setStudioName] = useState('My Beauty Studio');

    // User credentials
    const [email, setEmail] = useState('owner@example.com');
    const [phone, setPhone] = useState('+77001234567');
    const [password, setPassword] = useState('');

    // Tariffs
    const [tariff, setTariff] = useState<TariffPlan>(TariffPlan.Basic);

    // Schedule
    const [timezone, setTimezone] = useState('UTC+06:00');
    const [workStart, setWorkStart] = useState('10:00');
    const [workEnd, setWorkEnd] = useState('19:00');

    // Integrations
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [newIntegration, setNewIntegration] = useState({ name: '', url: '' });

    const handleAddIntegration = () => {
        if (newIntegration.name && newIntegration.url) {
            setIntegrations([...integrations, newIntegration]);
            setNewIntegration({ name: '', url: '' });
        }
    };
    const handleRemoveIntegration = (i: number) => setIntegrations(integrations.filter((_, idx) => idx !== i));

    const handleSave = (e: FormEvent) => {
        e.preventDefault();
        const settings = { studioName, email, phone, tariff, timezone, workStart, workEnd, integrations };
        console.log('Saved settings:', settings);
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <motion.form
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                onSubmit={handleSave}
                className="w-full bg-purple-900 bg-opacity-50 backdrop-blur-md p-5 sm:p-8 rounded-2xl text-white space-y-8"
            >
                <h1 className="text-center text-3xl font-bold">Настройки студии</h1>

                {/* Studio Name */}
                <section className="space-y-2">
                    <motion.h2 className="text-xl font-semibold"
                               initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                    >Общая информация</motion.h2>
                    <input
                        type="text"
                        value={studioName}
                        onChange={(e) => setStudioName(e.target.value)}
                        className="w-full px-4 py-2 rounded bg-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Название студии"
                    />
                </section>

                {/* User Credentials */}
                <section className="space-y-4">
                    <motion.h2 className="text-xl font-semibold"
                               initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                    >Личные данные</motion.h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email"
                               className="px-4 py-2 rounded bg-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <input type="text" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Телефон"
                               className="px-4 py-2 rounded bg-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Пароль"
                           className="w-full px-4 py-2 rounded bg-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </section>

                {/* Tariff Plans */}
                <section className="space-y-2">
                    <motion.h2 className="text-xl font-semibold"
                               initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                    >Тариф</motion.h2>
                    <div className="flex flex-col sm:flex-row gap-4">
                        {Object.values(TariffPlan).map(plan => (
                            <motion.div key={plan}
                                        className={clsx(
                                            'flex-1 p-4 rounded-lg cursor-pointer border',
                                            tariff === plan ? 'border-purple-400 bg-purple-800' : 'border-purple-700'
                                        )}
                                        onClick={() => setTariff(plan)}
                                        whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}
                            >
                                <h3 className="text-lg font-semibold">{plan}</h3>
                                <p className="mt-1 text-sm">{plan === TariffPlan.Basic ? 'Базовый пакет' : plan === TariffPlan.Pro ? 'Расширенный' : 'Максимальный'}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Schedule */}
                <section className="space-y-2">
                    <motion.h2 className="text-xl font-semibold"
                               initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                    >График работы</motion.h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <select value={timezone} onChange={(e)=>setTimezone(e.target.value)}
                                className="px-4 py-2 rounded bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option>UTC+03:00</option>
                            <option>UTC+06:00</option>
                            <option>UTC+09:00</option>
                        </select>
                        <div className="flex items-center gap-2">
                            <input type="time" value={workStart} onChange={(e)=>setWorkStart(e.target.value)}
                                   className="flex-1 min-w-0 px-4 py-2 rounded bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            <span className="px-1">—</span>
                            <input type="time" value={workEnd} onChange={(e)=>setWorkEnd(e.target.value)}
                                   className="flex-1 min-w-0 px-4 py-2 rounded bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                    </div>
                </section>

                {/* Integrations */}
                <section className="space-y-2">
                    <motion.h2 className="text-xl font-semibold"
                               initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                    >Доп. функции</motion.h2>
                    <div className="space-y-4">
                        {integrations.map((intg, idx) => (
                            <motion.div key={idx} className="flex flex-col sm:flex-row gap-2"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.1 }}
                            >
                                <input type="text" value={intg.name} readOnly className="flex-1 min-w-0 px-4 py-2 rounded bg-purple-800 text-purple-200" />
                                <input type="url" value={intg.url} readOnly className="flex-1 min-w-0 px-4 py-2 rounded bg-purple-800 text-purple-200" />
                                <button type="button" onClick={()=>handleRemoveIntegration(idx)}
                                        className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded shrink-0"
                                >Удалить</button>
                            </motion.div>
                        ))}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                                    className="flex flex-col sm:flex-row gap-2"
                        >
                            <input type="text" placeholder="Название сервиса" value={newIntegration.name}
                                   onChange={(e: ChangeEvent<HTMLInputElement>)=>setNewIntegration({...newIntegration,name:e.target.value})}
                                   className="flex-1 min-w-0 px-4 py-2 rounded bg-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            <input type="url" placeholder="URL" value={newIntegration.url}
                                   onChange={(e: ChangeEvent<HTMLInputElement>)=>setNewIntegration({...newIntegration,url:e.target.value})}
                                   className="flex-1 min-w-0 px-4 py-2 rounded bg-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            <button type="button" onClick={handleAddIntegration}
                                    className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded shrink-0"
                            >+ Добавить</button>
                        </motion.div>
                    </div>
                </section>

                <motion.button type="submit" className="w-full py-3 bg-purple-700 hover:bg-purple-600 rounded text-lg font-semibold"
                               whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}
                >Сохранить настройки</motion.button>
            </motion.form>
        </div>
    );
}