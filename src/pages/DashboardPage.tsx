'use client';

import {useState} from 'react';
import {EmployeeStatus, RecordEntry, Review, roles} from "@/types/types";
import {LayoutPage} from "@/ui/layouts/LayoutPage";
import {useAccess} from "@/hooks/useAccess";
import {useAuth} from "@/context/AuthContext";
import {Select} from "@/ui/select/Select";
import {WidgetCard} from "@/ui/widget-card/WidgetCard";

interface Business {
    id: string;
    name: string;
}

//TODO раскидать моки когда будет понятна структура данных
const recordsToday = 7;
const revenueToday = 25000;
const revenueWeek = 128000;
const recentRecords: RecordEntry[] = [
    {time: '09:00', client: 'Дарья', master: 'Елена'},
    {time: '10:30', client: 'Зарина', master: 'Дарья'},
    {time: '12:00', client: 'Анна', master: 'Виктория'}
];
const employeeActivity: EmployeeStatus[] = [
    {name: 'Анна', label: '🟢 В работе (13:00 – 14:00)'},
    {name: 'Виктор', label: '🕑 Свободен до 15:00'},
    {name: 'Оксана', label: '⛔ Сегодня выходной'}
];
const recentReviews: Review[] = [
    {rating: 5, comment: 'Спасибо за шикарные брови!', client: 'Алина'},
    {rating: 4, comment: 'Отлично, но пришлось ждать.', client: 'Диана'}
];

export default function DashboardPage() {
    const {businessesData, currentBusiness} = useAuth() as { businessesData: Business[], currentBusiness: string };
    const [selectedBusiness, setSelectedBusiness] = useState<string>(currentBusiness);
    const access = useAccess(roles.owner, roles.admin);

    if (access.status !== 'ok') {
        return <LayoutPage>{access.component}</LayoutPage>;
    }

    const availableWidgets = [
        {
            id: 'records',
            title: `Сегодня: ${recordsToday} записей`,
            content: (
                <>
                    <ul className="mt-4 space-y-1 text-sm">
                        {recentRecords.map((r, i) => (
                            <li key={i}>{r.time} — {r.client} ({r.master})</li>
                        ))}
                    </ul>
                </>
            ),
            link: '/calendar',
            buttonText: 'Перейти'
        },
        {
            id: 'revenue', title: 'Выручка за день / неделю',
            content: (
                <>
                    <p className="text-2xl font-bold">{revenueToday} ₸</p>
                    <p className="text-sm text-purple-300 mt-2">За неделю: {revenueWeek} ₸</p>
                </>
            ),
            link: '/finance',
            buttonText: 'Перейти'
        },
        {
            id: 'employees', title: 'Мои сотрудники',
            content: (
                <ul className="space-y-2 text-sm">
                    {employeeActivity.map((e, i) => (
                        <li key={i}>{e.name}: {e.label}</li>
                    ))}
                </ul>
            ),
            link: '/employees',
            buttonText: 'Перейти'
        },
        {
            id: 'reviews', title: 'Отзывы',
            content: (
                <ul className="space-y-2 text-sm">
                    {recentReviews.map((rev, i) => (
                        <li key={i}>{'⭐'.repeat(rev.rating)} — {rev.client}: {rev.comment}</li>
                    ))}
                </ul>
            ),
            link: '/reviews',
            buttonText: 'Перейти'
        },
        {
            id: 'create-business', title: 'Мои бизнесы',
            content: (
                <ul className="flex flex-col gap-3">
                    {businessesData.map((b) => (
                        <li key={b.id}>
                            {b.name}
                        </li>
                    ))}
                </ul>
            ),
            link: '/create-business',
            buttonText: 'Перейти'
        },
        {
            id: 'clients', title: 'Клиенская база',
            content: (
                <ul className="flex flex-col gap-3">

                </ul>
            ),
            link: '/clients',
            buttonText: 'Перейти'
        }
        // {
        //     id: 'actions', title: 'Быстрые действия',
        //     content: (
        //         <div className="flex flex-col gap-3">
        //             <Link href="/calendar">
        //                 <Button>
        //                     Добавить запись
        //                 </Button>
        //             </Link>
        //             <Link href="/clients">
        //                 <Button>
        //                     Добавить клиента
        //                 </Button>
        //             </Link>
        //             <Link href="/employees">
        //                 <Button>
        //                     Добавить сотрудника
        //                 </Button>
        //             </Link>
        //         </div>
        //     ),
        //     link: null,
        //     buttonText: 'Перейти'
        // },
    ];

    return (
        <LayoutPage>
            <div className="flex items-center gap-5 mb-6">
                <h1 className="text-3xl font-bold">
                    Панель управления
                </h1>
                {businessesData.length > 1 && (
                    <div className="w-64">
                        <Select
                            options={businessesData.map(biz => ({
                                label: biz.name,
                                value: biz.id,
                            }))}
                            value={selectedBusiness}
                            onChange={(val) => setSelectedBusiness(val)}
                        />
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {availableWidgets.map((widget) => (
                    <WidgetCard
                        key={widget.id}
                        title={widget.title}
                        link={widget.link}
                        buttonText={widget.buttonText}
                    >
                        {widget.content}
                    </WidgetCard>
                ))}
            </div>
        </LayoutPage>
    );
}
