'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {EmployeeStatus, RecordEntry, Review, roles, WidgetConfig} from "@/types/types";
import {LayoutPage} from "@/ui/layouts/LayoutPage";
import {DashboardWidget} from "@/widgets/DashboardWidget";
import {useAccess} from "@/hooks/useAccess";
import {useAuth} from "@/context/AuthContext";
import {routes} from "@/routes/routes";
import {Button} from "@/ui/button/Button";
import {Select} from "@/ui/select/Select";

 //mocks
 const recordsToday = 7;
 const revenueToday = 25000;
 const revenueWeek = 128000;
 const recentRecords: RecordEntry[] = [
     { time: '09:00', client: 'Дарья', master: 'Елена' },
     { time: '10:30', client: 'Зарина', master: 'Дарья' },
     { time: '12:00', client: 'Анна', master: 'Виктория' }
 ];
 const employeeActivity: EmployeeStatus[] = [
     { name: 'Анна', label: '🟢 В работе (13:00 – 14:00)' },
     { name: 'Виктор', label: '🕑 Свободен до 15:00' },
     { name: 'Оксана', label: '⛔ Сегодня выходной' }
 ];
 const recentReviews: Review[] = [
     { rating: 5, comment: 'Спасибо за шикарные брови!', client: 'Алина' },
     { rating: 4, comment: 'Отлично, но пришлось ждать.', client: 'Диана' }
 ];
 const availableWidgets: Record<string, WidgetConfig> = {
     records: {
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
         buttonText: 'Перейти в календарь'
     },
     revenue: {
         id: 'revenue', title: 'Выручка за день / неделю',
         content: (
             <>
                 <p className="text-2xl font-bold">{revenueToday} ₸</p>
                 <p className="text-sm text-purple-300 mt-2">За неделю: {revenueWeek} ₸</p>
             </>
         ),
         link: '/finance', buttonText: 'Перейти в аналитику'
     },
     activity: {
         id: 'activity', title: 'Активность сотрудников',
         content: (
             <ul className="space-y-2 text-sm">
                 {employeeActivity.map((e, i) => (
                     <li key={i}>{e.name}: {e.label}</li>
                 ))}
             </ul>
         ),
         link: '/employees', buttonText: 'Перейти к сотрудникам'
     },
     reviews: {
         id: 'reviews', title: 'Отзывы клиентов',
         content: (
             <ul className="space-y-2 text-sm">
                 {recentReviews.map((rev, i) => (
                     <li key={i}>{'⭐'.repeat(rev.rating)} — {rev.client}: {rev.comment}</li>
                 ))}
             </ul>
         ),
         link: '/reviews', buttonText: 'Перейти к отзывам'
     },
     actions: {
         id: 'actions', title: 'Быстрые действия',
         content: (
             <div className="flex flex-col gap-3">
                 <Link href="/calendar"><button className="bg-purple-700 hover:bg-purple-600 rounded-xl px-4 py-2">+ Добавить запись</button></Link>
                 <Link href="/clients"><button className="bg-purple-700 hover:bg-purple-600 rounded-xl px-4 py-2">+ Добавить клиента</button></Link>
                 <Link href="/employees"><button className="bg-purple-700 hover:bg-purple-600 rounded-xl px-4 py-2">+ Добавить сотрудника</button></Link>
             </div>
         ), link: null
     },
     createBusiness: {
         id: 'create-business', title: 'Мои бизнесы',
         content: (
             <div className="flex flex-col gap-3">
                <Link href={routes.CREATE_BUSINESS}>
                    <Button>
                        Перейти в создание бизнеса
                    </Button>
                </Link>
             </div>
         ), link: null
     }
 };

export default function DashboardPage() {
    const { businessesData } = useAuth();
    const access = useAccess(roles.owner);
    const [widgets] = useState(Object.values(availableWidgets));
    const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);

    useEffect(() => {
        if (businessesData.length > 0) {
            setSelectedBusiness(businessesData[0].id);
        }
    }, [businessesData]);

    if (access.status !== 'ok') {
        return <LayoutPage>{access.component}</LayoutPage>;
    }

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
                            value={selectedBusiness || ''}
                            onChange={(val) => setSelectedBusiness(val)}
                        />
                    </div>
                )}
            </div>
            <DashboardWidget widgets={widgets} />
        </LayoutPage>
    );
}
