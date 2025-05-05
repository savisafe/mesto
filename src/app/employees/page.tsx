'use client';

import {useState} from 'react';
import {roles} from "@/types/types";
import {supabase} from "../../../supabaseClient";
import {useAccess} from "@/hooks/useAccess";
import {LayoutPage} from "@/ui/layouts/LayoutPage";
import {useAuth} from "@/context/AuthContext";
import {Button} from "@/ui/button/Button";
import {Popup} from "@/ui/popup/Popup";
import {Input} from "@/ui/input/Input";
import {Select} from "@/ui/select/Select";
import Spinner from "@/ui/spinner/Spinner";

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
    const {currentBusiness, user} = useAuth();
    const userId = user?.id;
    const [staffRole, setStaffRole] = useState<string>('all');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const access = useAccess(roles.owner, roles.admin);
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'Мастер' | 'Админ'>('all');
    const [isOpen, setIsOpen] = useState(false);

    const fetchEmployees = async (businessId: string) => {
        const {data, error} = await supabase
            .from('employees')
            .select('*')
            .eq('business_id', businessId);

        if (error) {
            console.error('❌ Ошибка получения сотрудников:', error);
            return;
        }

        console.log('Сотрудники (user_id):', data);
    };

    const inviteEmployee = async (email: string, businessId: string, inviterId: string) => {
        setLoading(true);
        const {data, error} = await supabase
            .from('employee_invitations')
            .insert([
                {
                    email: email,
                    business_id: businessId,
                    invited_by: inviterId,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 часа
                }
            ])
            .select('*');

        if (error) {
            console.error('❌ Ошибка приглашения сотрудника:', error);
            return null;
        }

        if (!data || data.length === 0) {
            console.error('❌ Приглашение не создано');
            return null;
        }

        const invitation = data[0];

        const inviteLink = `${process.env.NEXT_PUBLIC_URL}/registration?invite=${invitation.id}`;

        console.log('✅ Приглашение сотрудника создано:', invitation);
        console.log('🔗 Ссылка для регистрации:', inviteLink);

        return {invitation, inviteLink};

        setLoading(false);
    };

    const openModal = () => setIsOpen(true);
    const closeModal = () => setIsOpen(false);

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
                <Button onClick={openModal}>
                    Добавить сотрудника
                </Button>
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
                    <Input
                        type="email"
                        placeholder="Email сотрудника"
                        value={email}
                        setValue={setEmail}
                        transitionDelay={0.3}
                    />
                    {!loading ?
                        <div className="flex justify-between">
                            <Button
                                loading={loading}
                                onClick={() => inviteEmployee(email, currentBusiness, userId)}
                            >
                                Сгенерировать ссылку
                            </Button>
                            <Button onClick={closeModal}>
                                Отмена
                            </Button>
                        </div>
                        : <Spinner/>}
                </Popup>
            }
        </div>
    );
}
