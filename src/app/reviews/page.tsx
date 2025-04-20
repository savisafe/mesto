// src/app/reviews/page.tsx
'use client';

import { useState, Fragment, ChangeEvent, FormEvent } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface VisitRef { client: string; employee: string; date: string; }
interface Review { date: string; rating: number; comment: string; visit: VisitRef; }

// Примеры отзывов
const initialReviews: Review[] = [
    { date: '2025-04-15', rating: 5, comment: 'Отлично! Всё супер.', visit: { client: 'Алина', employee: 'Дарья', date: '2025-04-15' } },
    { date: '2025-04-14', rating: 4, comment: 'Хорошо, но очередь большая.', visit: { client: 'Мария', employee: 'Виктория', date: '2025-04-14' } },
    { date: '2025-04-13', rating: 3, comment: 'Средне, ожидал лучше.', visit: { client: 'Екатерина', employee: 'Елена', date: '2025-04-13' } },
];
// Список сотрудников
const employees = ['Все', 'Дарья', 'Виктория', 'Елена'];

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>(initialReviews);
    const [filterClient, setFilterClient] = useState('');
    const [filterRating, setFilterRating] = useState(0);
    const [filterEmployee, setFilterEmployee] = useState('Все');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ date: '', rating: 5, comment: '', client: '', employee: '' });
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Фильтрация
    const filtered = reviews.filter(r =>
        r.visit.client.toLowerCase().includes(filterClient.toLowerCase()) &&
        (filterRating === 0 || r.rating === filterRating) &&
        (filterEmployee === 'Все' || r.visit.employee === filterEmployee)
    );

    // Модалки
    const openAddModal = () => {
        setEditingIndex(null);
        setForm({ date: '', rating: 5, comment: '', client: '', employee: '' });
        setIsModalOpen(true);
    };
    const openEditModal = (i: number) => {
        const rv = filtered[i];
        setEditingIndex(i);
        setForm({ date: rv.date, rating: rv.rating, comment: rv.comment, client: rv.visit.client, employee: rv.visit.employee });
        setIsModalOpen(true);
    };

    // Удаление
    const handleDelete = (i: number) => {
        const toDelete = filtered[i];
        setReviews(reviews.filter(r => r !== toDelete));
    };

    // Отправка
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const newReview: Review = {
            date: form.date,
            rating: form.rating,
            comment: form.comment,
            visit: { client: form.client, employee: form.employee, date: form.date }
        };
        if (editingIndex !== null) {
            const toEdit = filtered[editingIndex];
            setReviews(reviews.map(r => r === toEdit ? newReview : r));
        } else {
            setReviews([newReview, ...reviews]);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-purple-950 to-black text-white">
            <h1 className="text-3xl font-bold mb-6">Отзывы</h1>

            <div className="flex flex-wrap gap-4 items-center mb-6">
                <input
                    type="text"
                    placeholder="Поиск по клиенту"
                    value={filterClient}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFilterClient(e.target.value)}
                    className="px-3 py-2 rounded bg-purple-800 text-white placeholder-purple-400 flex-1"
                />
                <select
                    value={filterRating}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterRating(+e.target.value)}
                    className="px-3 py-2 rounded bg-purple-800 text-white"
                >
                    <option value={0}>Все рейтинги</option>
                    {[1,2,3,4,5].map(n => (
                        <option key={n} value={n}>{n} ⭐</option>
                    ))}
                </select>
                <select
                    value={filterEmployee}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterEmployee(e.target.value)}
                    className="px-3 py-2 rounded bg-purple-800 text-white"
                >
                    {employees.map(emp => (
                        <option key={emp} value={emp}>{emp}</option>
                    ))}
                </select>
                <button
                    onClick={openAddModal}
                    className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-xl"
                >+ Отзыв</button>
            </div>

            <ul className="space-y-4">
                {filtered.map((r, i) => (
                    <li key={i} className="bg-purple-800 bg-opacity-30 p-4 rounded-xl border border-purple-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-purple-300">{r.date}</span>
                            <span className="text-lg">{Array.from({ length: r.rating }).map(() => '⭐')}</span>
                        </div>
                        <p className="text-white mb-2">{r.comment}</p>
                        <p className="text-sm text-purple-300">Визит: {r.visit.client} → {r.visit.employee} ({r.visit.date})</p>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => openEditModal(i)}
                                className="bg-purple-700 hover:bg-purple-600 px-3 py-1 rounded text-white"
                            >Редактировать</button>
                            <button
                                onClick={() => handleDelete(i)}
                                className="bg-purple-700 hover:bg-purple-600 px-3 py-1 rounded text-white"
                            >Удалить</button>
                        </div>
                    </li>
                ))}
            </ul>

            {/* Modal add/edit */}
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
                                        {editingIndex !== null ? 'Редактировать отзыв' : 'Добавить отзыв'}
                                    </Dialog.Title>
                                    <form onSubmit={handleSubmit} className="space-y-3 text-left">
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, date: e.target.value })}
                                            className="w-full px-3 py-2 rounded-md bg-purple-800 text-white placeholder-purple-400"
                                            required
                                        />
                                        <select
                                            value={form.rating}
                                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, rating: +e.target.value })}
                                            className="w-full px-3 py-2 rounded-md bg-purple-800 text-white"
                                        >
                                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ⭐</option>)}
                                        </select>
                                        <input
                                            type="text"
                                            placeholder="Клиент"
                                            value={form.client}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, client: e.target.value })}
                                            className="w-full px-3 py-2 rounded-md bg-purple-800 text-white placeholder-purple-400"
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Сотрудник"
                                            value={form.employee}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, employee: e.target.value })}
                                            className="w-full px-3 py-2 rounded-md bg-purple-800 text-white placeholder-purple-400"
                                            required
                                        />
                                        <textarea
                                            placeholder="Комментарий"
                                            value={form.comment}
                                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, comment: e.target.value })}
                                            className="w-full px-3 py-2 rounded-md bg-purple-800 text-white placeholder-purple-400"
                                            rows={3}
                                        />
                                        <div className="mt-6 flex justify-end gap-2">
                                            <button
                                                type="button"
                                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
                                                onClick={() => setIsModalOpen(false)}
                                            >Отмена</button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded text-white"
                                            >{editingIndex!==null ? 'Сохранить' : 'Добавить'}</button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}