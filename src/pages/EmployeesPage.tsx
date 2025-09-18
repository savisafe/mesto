'use client';

import {useState} from 'react';
import {useAccess} from "@/hooks/useAccess";
import {LayoutPage} from "@/ui/layouts/LayoutPage";
import {Button} from "@/ui/button/Button";
import {Popup} from "@/ui/popup/Popup";
import {Input} from "@/ui/input/Input";
import {Select} from "@/ui/select/Select";
import {useNotification} from "@/contexts/NotificationContext";
import {MessageCircle, Send} from "lucide-react";

interface Appointment {
    id: number;
    time: string;
    client: string;
}

interface Employee {
    id: number;
    name: string;
    phone: string;
    position: string;
    branch: string;
    role: 'Мастер' | 'Админ';
    revenue: number;
    schedule: string;
    appointments: Appointment[];
}

const initialEmployees: Employee[] = [
    {
        id: 1,
        name: 'Дарья',
        phone: '+77770000000',
        position: 'Бровист',
        branch: 'Филиал 1',
        role: 'Мастер',
        revenue: 45000,
        schedule: '10:00 - 18:00',
        appointments: [
            {id: 101, time: '09:00–09:30', client: 'Анна'},
            {id: 102, time: '11:00–12:00', client: 'Мария'}
        ],
    },
    {
        id: 2,
        name: 'Анна',
        phone: '+77770000001',
        position: 'Мастер маникюра',
        branch: 'Филиал 1',
        role: 'Мастер',
        revenue: 38000,
        schedule: '09:00 - 17:00',
        appointments: [
            {id: 201, time: '10:00–11:00', client: 'Елена'},
            {id: 202, time: '14:00–15:00', client: 'Ольга'}
        ],
    },
    {
        id: 3,
        name: 'Мария',
        phone: '+77770000002',
        position: 'Администратор',
        branch: 'Филиал 1',
        role: 'Админ',
        revenue: 25000,
        schedule: '08:00 - 20:00',
        appointments: [],
    },
];

export default function EmployeesPage() {
    const alert = useNotification();
    const {hasAccess} = useAccess();
    const [employees] = useState<Employee[]>(initialEmployees);
    const [loading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'Мастер' | 'Админ'>('all');
    const [isOpen, setIsOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [email, setEmail] = useState('');

    const filteredEmployees = employees.filter(employee => {
        const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             employee.phone.includes(searchTerm) ||
                             employee.position.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const openModal = () => setIsOpen(true);
    const closeModal = () => {
        setEmail('');
        setInviteLink('');
        setIsOpen(false);
    };

    const copyInviteLink = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            alert('success', 'Ссылка скопирована в буфер обмена');
        }
    };

    if (!hasAccess) {
        return (
            <LayoutPage>
                <div className="text-center text-red-400">
                    У вас нет доступа к этой странице
                </div>
            </LayoutPage>
        );
    }

    return (
        <LayoutPage>
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Сотрудники</h1>
                    <Button onClick={openModal}>
                        Пригласить сотрудника
                    </Button>
                </div>

                {/* Фильтры */}
                <div className="flex gap-4 mb-6">
                    <Input
                        type="text"
                        placeholder="Поиск по имени, телефону или должности"
                        value={searchTerm}
                        setValue={setSearchTerm}
                    />
                    <Select
                        value={roleFilter}
                        onChange={(value) => setRoleFilter(value as 'all' | 'Мастер' | 'Админ')}
                        options={[
                            {value: 'all', label: 'Все роли'},
                            {value: 'Мастер', label: 'Мастер'},
                            {value: 'Админ', label: 'Админ'}
                        ]}
                    />
                </div>

                {/* Список сотрудников */}
                <div className="grid gap-4">
                    {filteredEmployees.map(employee => (
                        <div key={employee.id} className="bg-purple-800 bg-opacity-30 border border-purple-700 rounded-lg p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{employee.name}</h3>
                                    <p className="text-purple-300">{employee.position}</p>
                                    <p className="text-purple-400 text-sm">{employee.phone}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-3 py-1 rounded-full text-sm ${
                                        employee.role === 'Мастер' 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-purple-600 text-white'
                                    }`}>
                                        {employee.role}
                                    </span>
                                    <p className="text-green-400 font-semibold mt-2">
                                        {employee.revenue.toLocaleString()} ₽
                                    </p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-white font-semibold mb-2">Расписание</h4>
                                    <p className="text-purple-300">{employee.schedule}</p>
                                </div>
                                <div>
                                    <h4 className="text-white font-semibold mb-2">Записи на сегодня</h4>
                                    {employee.appointments.length > 0 ? (
                                        <div className="space-y-1">
                                            {employee.appointments.map(appointment => (
                                                <div key={appointment.id} className="text-purple-300 text-sm">
                                                    {appointment.time} - {appointment.client}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-purple-400 text-sm">Нет записей</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <Button>
                                    <MessageCircle size={16} className="mr-2" />
                                    Написать
                                </Button>
                                <Button>
                                    Редактировать
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredEmployees.length === 0 && (
                    <div className="text-center text-purple-400 py-8">
                        Сотрудники не найдены
                    </div>
                )}

                {/* Попап приглашения */}
                {isOpen && (
                    <Popup title="Пригласить сотрудника">
                        {!inviteLink ? (
                            <>
                                <Input
                                    type="email"
                                    placeholder="Email сотрудника"
                                    value={email}
                                    setValue={setEmail}
                                    transitionDelay={0.25}
                                />
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        loading={loading}
                                        onClick={() => {
                                            alert('info', 'Функция приглашения сотрудников будет доступна в следующих версиях');
                                            closeModal();
                                        }}
                                        transitionDelay={0.35}
                                    >
                                        <Send size={16} className="mr-2" />
                                        Сгенерировать ссылку
                                    </Button>
                                    <Button onClick={closeModal} transitionDelay={0.4}>
                                        Отмена
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center">
                                    <p className="text-purple-300 mb-4">Ссылка для приглашения:</p>
                                    <div className="bg-purple-900 p-3 rounded border">
                                        <code className="text-green-400 text-sm break-all">{inviteLink}</code>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        onClick={copyInviteLink}
                                        transitionDelay={0.35}
                                    >
                                        Копировать ссылку
                                    </Button>
                                    <Button onClick={closeModal} transitionDelay={0.4}>
                                        Закрыть
                                    </Button>
                                </div>
                            </>
                        )}
                    </Popup>
                )}
            </div>
        </LayoutPage>
    );
}