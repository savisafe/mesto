'use client';

import {useEffect, useState} from 'react';
import {roles} from "@/types/types";
import {useAccess} from "@/hooks/useAccess";
import {LayoutPage} from "@/ui/layouts/LayoutPage";
import {useAuth} from "@/contexts/AuthContext";
import {Button} from "@/ui/button/Button";
import {Popup} from "@/ui/popup/Popup";
import {Input} from "@/ui/input/Input";
import {Select} from "@/ui/select/Select";
import Spinner from "@/ui/spinner/Spinner";
import {supabase} from "../../supabaseClient";
import {useBusiness} from "@/contexts/BusinessContext";
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
        name: 'Виктория',
        phone: '+77771112233',
        position: 'Лешмейкер',
        branch: 'Филиал 2',
        role: 'Мастер',
        revenue: 39000,
        schedule: '12:00 - 20:00',
        appointments: [
            {id: 201, time: '10:00–11:00', client: 'Ольга'}
        ],
    },
    {
        id: 3,
        name: 'Елена',
        phone: '+77772223344',
        position: 'Администратор',
        branch: 'Филиал 1',
        role: 'Админ',
        revenue: 0,
        schedule: '09:00 - 17:00',
        appointments: [],
    }
];

export default function EmployeesPage() {
    const alert = useNotification();
    const {user} = useAuth();
    const {currentBusiness} = useBusiness();
    const userId = user?.id;
    const [staffRole, setStaffRole] = useState<string>('all');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const access = useAccess(roles.owner, roles.admin);
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter] = useState<'all' | 'Мастер' | 'Админ'>('all');
    const [isOpen, setIsOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState('');

    const fetchEmployees = async (businessId: string) => {
        const {data, error} = await supabase
            .from('employees')
            .select('*')
            .eq('business_id', businessId);

        if (error) {
            alert('error', 'Ошибка получения сотрудников');
            return;
        }

        console.log(data);
    };

    useEffect(() => {
        if (currentBusiness?.length > 0) {
            fetchEmployees(currentBusiness);
        }
    }, [currentBusiness]);

    const inviteEmployee = async (email: string, businessId: string, inviterId: string) => {
        if (email.length === 0) return alert('error', 'Введите email сотрудника');
        try {
            setLoading(true);

            const {data, error} = await supabase
                .from('employee_invitations')
                .insert([
                    {
                        email,
                        business_id: businessId,
                        invited_by: inviterId,
                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    },
                ])
                .select('*');

            if (error) {
                alert('error', 'Ошибка приглашения сотрудника');
                return null;
            }

            if (!data || data.length === 0) {
                alert('error', 'Приглашение не создано');
                return null;
            }

            const invitation = data[0];
            const link = `${window.location.origin}/registration?invite=${invitation.id}`;

            setInviteLink(link);
            alert('success', 'Приглашение сотрудника создано');

            return {invitation, inviteLink: link};
        } finally {
            setLoading(false);
        }
    };

    const openModal = () => setIsOpen(true);
    const closeModal = () => {
        setEmail('');
        setInviteLink('');
        setIsOpen(false);
    }

    const handleDelete = (id: number) => {
        setEmployees(employees.filter(e => e.id !== id));
    };

    if (access.status !== 'ok') {
        return <LayoutPage>{access.component}</LayoutPage>;
    }

    const staffRoles = [
        {id: 'all', role: 'Все сотрудники'},
        {id: '1', role: 'Основатель'},
        {id: '2', role: 'Менеджер'},
        {id: '3', role: 'Сотрудник'},
    ];

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-purple-950 to-black text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Сотрудники</h1>
                <div className="w-1/4">
                    <Button onClick={openModal}>
                        Добавить сотрудника
                    </Button>
                </div>
            </div>

            <div className="mb-6 flex gap-4">
                <Input
                    type="text"
                    placeholder="Поиск по имени..."
                    value={searchTerm}
                    setValue={setSearchTerm}
                    transitionDelay={0.3}
                />
                <div className="w-64">
                    <Select
                        options={staffRoles.map(e => ({
                            label: e.role,
                            value: e.id,
                        }))}
                        value={staffRole}
                        onChange={(val) => setStaffRole(val)}
                    />
                </div>
            </div>

            {/* Карточки сотрудников */}
            <div className="flex space-x-6 overflow-x-auto pb-4">
                {employees
                    .filter(emp =>
                        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                        (roleFilter === 'all' || emp.role === roleFilter)
                    )
                    .map(emp => (
                        <div
                            key={emp.id}
                            className="flex-shrink-0 w-64 bg-purple-800 bg-opacity-30 border border-purple-700 p-4 rounded-xl"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-xl font-semibold">{emp.name}</h2>
                                <button
                                    onClick={() => handleDelete(emp.id)}
                                    className="text-red-500 hover:text-red-400"
                                >
                                    ✕
                                </button>
                            </div>
                            <p className="text-sm text-purple-300 mb-1">Роль: {emp.role}</p>
                            <p className="text-sm text-purple-300 mb-2">Филиал: {emp.branch}</p>
                            <h3 className="text-lg font-medium mb-1">День сотрудника</h3>
                            {emp.appointments.length > 0 ? (
                                <ul className="space-y-1 text-sm">
                                    {emp.appointments.map(a => (
                                        <li key={a.id}>• {a.time} — {a.client}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-purple-400">Нет записей на сегодня</p>
                            )}
                        </div>
                    ))}
            </div>

            {isOpen &&
                <Popup title='Добавление сотрудника'>
                    {inviteLink.length > 0 ? (
                        <div className="space-y-4">
                            <div className="mb-2">🔗 Ссылка для регистрации:</div>
                            <Input type="text" value={inviteLink} showCopyButton={true} setValue={() => {}} />

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => {
                                        const text = `Привет! Вот ссылка для регистрации`;
                                        const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
                                        window.open(url, '_blank');
                                    }}
                                    className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#229ED9] text-white font-semibold hover:bg-opacity-90 transition"
                                >
                                    <Send size={18} />
                                    Telegram
                                </button>

                                <button
                                    onClick={() => {
                                        const text = `Привет! Вот ссылка для регистрации ${inviteLink}`;
                                        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                                        window.open(url, '_blank');
                                    }}
                                    className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-opacity-90 transition"
                                >
                                    <MessageCircle size={18} />
                                    WhatsApp
                                </button>
                            </div>

                            <div className="mx-auto w-full text-center">
                                <Button onClick={closeModal}>Назад</Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Input
                                type="email"
                                placeholder="Email сотрудника"
                                value={email}
                                setValue={setEmail}
                                transitionDelay={0.3}
                            />
                            {!loading ? (
                                <div className="flex justify-between gap-4">
                                    <Button
                                        loading={loading}
                                        onClick={() => inviteEmployee(email, currentBusiness, userId)}
                                    >
                                        Сгенерировать ссылку
                                    </Button>
                                    <Button onClick={closeModal}>Отмена</Button>
                                </div>
                            ) : (
                                <Spinner />
                            )}
                        </>
                    )}

                </Popup>
            }
        </div>
    );
}
