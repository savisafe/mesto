// src/app/employees/page.tsx
'use client';

import { useState, Fragment, ChangeEvent, FormEvent } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface Employee {
    id: number;
    name: string;
    phone: string;
    position: string;
    branch: string;
    role: 'Мастер' | 'Админ';
    revenue: number;
    schedule: string;
}
interface Appointment { time: string; client: string; }

// Пример данных
const initialEmployees: Employee[] = [
    {
        id: 1, name: 'Дарья', role: 'Мастер', branch: 'Филиал 1',
        phone: '',
        position: '',
        revenue: 0,
        schedule: ''
    },
    {
        id: 2, name: 'Виктория', role: 'Мастер', branch: 'Филиал 2',
        phone: '',
        position: '',
        revenue: 0,
        schedule: ''
    },
    {
        id: 3, name: 'Елена', role: 'Админ', branch: 'Филиал 1',
        phone: '',
        position: '',
        revenue: 0,
        schedule: ''
    }
];
const appointments: Record<number, Appointment[]> = {
    1: [ { time: '09:00–09:30', client: 'Анна' }, { time: '11:00–12:00', client: 'Мария' } ],
    2: [ { time: '10:00–11:00', client: 'Ольга' } ],
    3: []
};

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);

    // Модалка добавления сотрудника
    const [isOpen, setIsOpen] = useState(false);
    const [newEmp, setNewEmp] = useState<{
        name: string;
        role: 'Мастер' | 'Админ';
        branch: string;
    }>({
        name: '',
        role: 'Мастер',
        branch: '',
    });

    const openModal = () => setIsOpen(true);
    const closeModal = () => setIsOpen(false);

    const handleAdd = (e: FormEvent) => {
        e.preventDefault();
        const id = Date.now();
        setEmployees([
            ...employees,
            {
                id,
                name: newEmp.name,
                role: newEmp.role,
                branch: newEmp.branch,
                phone: '',
                position: '',
                revenue: 0,
                schedule: '',
            } as Employee
        ]);
        setNewEmp({ name: '', role: 'Мастер', branch: '' });
        closeModal();
    };

    const handleDelete = (id: number) => {
        setEmployees(employees.filter(e => e.id !== id));
    };

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-purple-950 to-black text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Сотрудники</h1>
                <button onClick={openModal} className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-xl">
                    + Добавить сотрудника
                </button>
            </div>
            <div className="flex space-x-6 overflow-x-auto pb-4">
                {employees.map(emp => (
                    <div key={emp.id} className="flex-shrink-0 w-64 bg-purple-800 bg-opacity-30 border border-purple-700 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-semibold">{emp.name}</h2>
                            <button onClick={() => handleDelete(emp.id)} className="text-red-500 hover:text-red-400">✕</button>
                        </div>
                        <p className="text-sm text-purple-300 mb-1">Роль: {emp.role}</p>
                        <p className="text-sm text-purple-300 mb-2">Филиал: {emp.branch}</p>
                        <h3 className="text-lg font-medium mb-1">День сотрудника</h3>
                        {appointments[emp.id]?.length ? (
                            <ul className="space-y-1 text-sm">
                                {appointments[emp.id].map((a, i) => (
                                    <li key={i}>• {a.time} — {a.client}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-purple-400">Нет записей на сегодня</p>
                        )}
                    </div>
                ))}
                {/* Карточка для добавления нового виджета */}
                {/* ...если нужна, можно сюда добавить */}
            </div>

            {/* Модалка */}
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={closeModal}>
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

                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md bg-purple-900 p-6 rounded-2xl border border-purple-700">
                                <Dialog.Title className="text-lg font-medium text-white mb-4">
                                    Добавить сотрудника
                                </Dialog.Title>
                                <form onSubmit={handleAdd} className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Имя"
                                        value={newEmp.name}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                            setNewEmp({ ...newEmp, name: e.target.value })
                                        }
                                        className="w-full px-3 py-2 bg-purple-800 rounded text-white"
                                        required
                                    />
                                    <select
                                        value={newEmp.role}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                            setNewEmp({ ...newEmp, role: e.target.value as 'Мастер' | 'Админ' })
                                        }
                                        className="w-full px-3 py-2 bg-purple-800 rounded text-white"
                                    >
                                        <option value="Мастер">Мастер</option>
                                        <option value="Админ">Админ</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Филиал"
                                        value={newEmp.branch}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                            setNewEmp({ ...newEmp, branch: e.target.value })
                                        }
                                        className="w-full px-3 py-2 bg-purple-800 rounded text-white"
                                        required
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-600 rounded">
                                            Отмена
                                        </button>
                                        <button type="submit" className="px-4 py-2 bg-purple-700 rounded">
                                            Добавить
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}
