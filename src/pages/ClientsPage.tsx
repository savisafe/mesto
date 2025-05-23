'use client';

import { useState, Fragment, ChangeEvent } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import clsx from 'clsx';

interface Visit {
    date: string;
    comment: string;
}

interface Client {
    name: string;
    phone: string;
    note: string;
    visits: Visit[];
    blacklisted: boolean;
}

// Образцы имен и примечаний для реалистичных данных
const sampleNames = [
    'Иван Иванов', 'Мария Смирнова', 'Алексей Кузнецов', 'Елена Попова',
    'Дмитрий Соколов', 'Ольга Лебедева', 'Сергей Ковалёв', 'Анна Новикова',
    'Николай Морозов', 'Татьяна Смирнова'
];
const sampleNotes = [
    'Постоянный клиент', 'Требуется консультация', 'Новая клиентка',
    'Аллергия на краску', 'Предпочитает вечернее время'
];

// Генерация большого объёма клиентов (например, 10000)
const TOTAL_CLIENTS = 10000;
const initialClients: Client[] = Array.from({ length: TOTAL_CLIENTS }, (_, i) => ({
    name: `${sampleNames[i % sampleNames.length]} ${i + 1}`,
    phone: `+7${(9000000000 + i).toString().padStart(10, '0')}`,
    note: sampleNotes[i % sampleNotes.length],
    visits: [],
    blacklisted: false
}));

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>(initialClients);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', note: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 15;

    // Фильтрация по поиску
    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
    );

    // Пагинация
    const pageCount = Math.ceil(filtered.length / perPage);
    const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

    const handleAdd = () => {
        setClients([{ ...form, visits: [], blacklisted: false }, ...clients]);
        setIsModalOpen(false);
        setForm({ name: '', phone: '', note: '' });
    };

    const handleDelete = (idx: number) => {
        const list = [...clients];
        const globalIdx = (currentPage - 1) * perPage + idx;
        list.splice(globalIdx, 1);
        setClients(list);
    };

    const handleBlacklist = (idx: number) => {
        const list = [...clients];
        const globalIdx = (currentPage - 1) * perPage + idx;
        list[globalIdx].blacklisted = !list[globalIdx].blacklisted;
        setClients(list);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setCurrentPage(1);
    };

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-purple-950 to-black text-white">
            <h1 className="text-3xl font-bold mb-6">Клиенты ({clients.length})</h1>

            <div className="flex flex-wrap gap-4 items-center mb-6">
                <input
                    type="text"
                    placeholder="Поиск по имени или телефону"
                    value={search}
                    onChange={handleSearchChange}
                    className="px-3 py-2 rounded bg-purple-800 text-white placeholder-purple-400 flex-1 min-w-[200px]"
                />
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-xl whitespace-nowrap"
                >
                    + Добавить клиента
                </button>
            </div>

            {/* Обертка для таблицы с горизонтальной прокруткой */}
            <div className="overflow-x-auto pb-2">
                <div className="min-w-[650px]"> {/* Минимальная ширина для таблицы */}
                    <table className="w-full table-auto text-left border-separate border-spacing-y-2 mb-4">
                        <thead>
                        <tr>
                            <th className="px-4 py-2 whitespace-nowrap">Имя</th>
                            <th className="px-4 py-2 whitespace-nowrap">Телефон</th>
                            <th className="px-4 py-2 whitespace-nowrap">Примечание</th>
                            <th className="px-4 py-2 whitespace-nowrap">Визиты</th>
                            <th className="px-4 py-2 whitespace-nowrap">Действия</th>
                        </tr>
                        </thead>
                        <tbody>
                        {paginated.map((c, idx) => (
                            <tr key={idx} className={c.blacklisted ? 'opacity-50' : ''}>
                                <td className="px-4 py-2 whitespace-nowrap">{c.name}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{c.phone}</td>
                                <td className="px-4 py-2 whitespace-nowrap max-w-[150px] truncate" title={c.note}>
                                    {c.note}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">{c.visits.length}</td>
                                <td className="px-4 py-2 whitespace-nowrap space-x-2">
                                    <button className="bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-white whitespace-nowrap">
                                        Посещаемость
                                    </button>
                                    <button className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-white whitespace-nowrap">
                                        Рассылка
                                    </button>
                                    <button
                                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-2 py-1 rounded whitespace-nowrap"
                                        onClick={() => handleBlacklist(idx)}
                                    >
                                        {c.blacklisted ? 'Разблокировать' : 'В ЧС'}
                                    </button>
                                    <button
                                        className="bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-white whitespace-nowrap"
                                        onClick={() => handleDelete(idx)}
                                    >
                                        Удалить
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Пагинация с первым, последним и тремя вокруг */}
            <div className="flex justify-center space-x-2 mb-6 mt-[25px]">
                {/* Кнопка начала */}
                <button
                    onClick={() => handlePageChange(1)}
                    className={clsx('px-3 py-1 rounded', currentPage === 1 ? 'bg-purple-500' : 'bg-purple-700 hover:bg-purple-600')}
                >
                    1
                </button>

                {/* Показ эллипса перед текущими */}
                {currentPage > 3 && <span className="px-2">...</span>}

                {/* Три страницы вокруг текущей */}
                {[-1, 0, 1].map(offset => {
                    const page = currentPage + offset;
                    if (page > 1 && page < pageCount) {
                        return (
                            <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={clsx('px-3 py-1 rounded', currentPage === page ? 'bg-purple-500' : 'bg-purple-700 hover:bg-purple-600')}
                            >
                                {page}
                            </button>
                        );
                    }
                    return null;
                })}

                {/* Эллипс после */}
                {currentPage < pageCount - 2 && <span className="px-2">...</span>}

                {/* Кнопка конца */}
                <button
                    onClick={() => handlePageChange(pageCount)}
                    className={clsx('px-3 py-1 rounded', currentPage === pageCount ? 'bg-purple-500' : 'bg-purple-700 hover:bg-purple-600')}
                >
                    {pageCount}
                </button>
            </div>

            {/* Modal for Adding Client */}
            <Transition appear show={isModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
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
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-purple-900 p-6 shadow-xl transition-all border border-purple-700">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white mb-4">
                                        Добавить клиента
                                    </Dialog.Title>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Имя"
                                            value={form.name}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
                                            className="w-full px-3 py-2 rounded-md bg-purple-800 text-white placeholder-purple-400"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Телефон"
                                            value={form.phone}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, phone: e.target.value })}
                                            className="w-full px-3 py-2 rounded-md bg-purple-800 text-white placeholder-purple-400"
                                        />
                                        <textarea
                                            placeholder="Примечание"
                                            value={form.note}
                                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, note: e.target.value })}
                                            className="w-full px-3 py-2 rounded-md bg-purple-800 text-white placeholder-purple-400"
                                        />
                                    </div>
                                    <div className="mt-6 flex justify-end gap-2">
                                        <button className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white" onClick={() => setIsModalOpen(false)}>
                                            Отмена
                                        </button>
                                        <button className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white" onClick={handleAdd}>
                                            Добавить
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}