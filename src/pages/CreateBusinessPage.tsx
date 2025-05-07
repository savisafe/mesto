'use client';

import {LayoutPage} from "@/ui/layouts/LayoutPage";
import {Input} from "@/ui/input/Input";
import {useEffect, useState} from "react";
import {Button} from "@/ui/button/Button";
import {supabase} from "../../supabaseClient";
import {useAccess} from "@/hooks/useAccess";
import {Business, roles} from "@/types/types";
import {Popup} from "@/ui/popup/Popup";
import {useAuth} from "@/context/AuthContext";
import {useNotification} from "@/context/NotificationContext";
import Spinner from "@/ui/spinner/Spinner";
import { motion } from "framer-motion";

export default function CreateBusinessPage() {
    const alert = useNotification();
    const {user, role} = useAuth();
    const access = useAccess(roles.owner, roles.admin);
    const [businessName, setBusinessName] = useState('');
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
    const [editBusinessName, setEditBusinessName] = useState('');
    const [createPopupOpen, setCreatePopupOpen] = useState(false);

    const fetchBusiness = async () => {
        setLoading(true);

        if (!user?.id) {
            alert('error', 'Нет авторизованного пользователя');
            return;
        }

        const { data: businesses, error: businessesError } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', user.id);

        if (businessesError) {
            alert('error', 'Ошибка получения бизнесов');
        } else {
            setBusinesses(businesses || []);
            if ((businesses || []).length === 0) setCreatePopupOpen(true);
            if (businesses.length > 0) alert('success', 'Бизнесы получены ✅');
        }

        setLoading(false);
    };

    const handleCreateBusiness = async () => {
        if (!user) {
            alert('info', 'Нет авторизованного пользователя');
            return;
        }

        if (role !== roles.owner && role !== roles.admin) {
            alert('error', 'Только владелец бизнеса может создать бизнес');
            return;
        }

        if (!businessName || businessName.trim() === '') {
            alert('error', 'Название бизнеса не заполнено');
            return;
        }

        const { error } = await supabase.rpc('create_business', {
            p_name: businessName,
        });

        if (error) {
            alert('error', 'Ошибка создания бизнеса:');
        } else {
            alert('success', 'Бизнес успешно создан ✅');
            setBusinessName('');
            setCreatePopupOpen(false);
            fetchBusiness();
        }
    };

    const handleDeleteBusiness = async (id: string) => {
        alert('info', 'Начинаем удаление бизнеса ⏳');

        const { error } = await supabase
            .from('businesses')
            .delete()
            .eq('id', id)
            .select();

        if (error) {
            alert('error', 'Ошибка удаления бизнеса ❌');
        } else {
            alert('success', 'Бизнес успешно удален ✅');
            fetchBusiness();
        }
    };

    const openEditBusiness = (biz: Business) => {
        setCurrentBusinessId(biz.id);
        setEditBusinessName(biz.name);
        setEditMode(true);
    };

    const handleUpdateBusiness = async () => {
        if (!currentBusinessId || !editBusinessName.trim()) {
            alert('info', 'Нет данных для обновления бизнеса');
            return;
        }

        const { error } = await supabase
            .from('businesses')
            .update({ name: editBusinessName })
            .eq('id', currentBusinessId);

        if (error) {
            alert('error', 'Ошибка обновления бизнеса:');
        } else {
            setEditMode(false);
            setCurrentBusinessId(null);
            setEditBusinessName('');
            fetchBusiness();
            alert('success','Бизнес успешно обновлен ✅');
        }
    };

    useEffect(() => {
        if (user) {
            fetchBusiness();
        }
    }, [user]);

    if (access.status !== 'ok') {
        return <LayoutPage>{access.component}</LayoutPage>;
    }

    return (
        <LayoutPage>
            {businesses.length > 0 && (
                <div className="flex justify-between">
                    <h1 className="text-3xl font-bold mb-6">Мои бизнесы</h1>
                    <div className="w-1/5">
                        <Button onClick={() => setCreatePopupOpen(true)}>
                            Создать новый бизнес
                        </Button>
                    </div>
                </div>
            )}

            {createPopupOpen && (
                <Popup title="Создание бизнеса">
                    <Input
                        type="text"
                        placeholder="Введите название бизнеса"
                        value={businessName}
                        setValue={setBusinessName}
                    />
                    <div className="flex justify-between">
                        <Button onClick={handleCreateBusiness}>
                            Создать бизнес
                        </Button>
                        <Button onClick={() => setCreatePopupOpen(false)}>
                            Отмена
                        </Button>
                    </div>
                </Popup>
            )}

            {editMode && (
                <Popup title="Редактирование бизнеса">
                    <Input
                        type="text"
                        placeholder="Новое название бизнеса"
                        value={editBusinessName}
                        setValue={setEditBusinessName}
                    />
                    <div className="flex justify-between">
                        <Button onClick={handleUpdateBusiness}>
                            Сохранить изменения
                        </Button>
                        <Button onClick={() => setEditMode(false)}>
                            Отмена
                        </Button>
                    </div>
                </Popup>
            )}

            <motion.div className="mt-6">
                {loading ? (
                    <Spinner/>
                ) : businesses.length === 0 ? (
                    <p>У вас пока нет бизнесов.</p>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4}}
                        className="grid gap-4">
                        {businesses.map((biz) => (
                            <div key={biz?.id} className="p-4 border rounded shadow flex justify-between items-center">
                                <span className="font-medium">{biz?.name}</span>
                                <div className="flex gap-2">
                                    <Button onClick={() => openEditBusiness(biz)}>
                                        ✏️ Редактировать
                                    </Button>
                                    <Button onClick={() => handleDeleteBusiness(biz?.id)}>
                                        🗑️ Удалить
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </motion.div>
        </LayoutPage>
    );
}