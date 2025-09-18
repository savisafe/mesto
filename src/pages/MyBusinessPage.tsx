'use client';

import {LayoutPage} from "@/ui/layouts/LayoutPage";
import {Input} from "@/ui/input/Input";
import {useEffect, useState} from "react";
import {Button} from "@/ui/button/Button";
import {useAccess} from "@/hooks/useAccess";
import {Business, roles} from "@/lib/apiClient";
import {Popup} from "@/ui/popup/Popup";
import {useAuth} from "@/contexts/AuthContext";
import {useNotification} from "@/contexts/NotificationContext";
import {useBusiness} from "@/contexts/BusinessContext";
import Spinner from "@/ui/spinner/Spinner";
import { motion } from "framer-motion";

export default function MyBusinessPage() {
    const alert = useNotification();
    const {user, role} = useAuth();
    const {businessesData, loading, createBusiness, updateBusiness, deleteBusiness, fetchBusinesses} = useBusiness();
    const {hasAccess} = useAccess();
    const [businessName, setBusinessName] = useState('');
    const [businessDescription, setBusinessDescription] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
    const [editBusinessName, setEditBusinessName] = useState('');
    const [editBusinessDescription, setEditBusinessDescription] = useState('');
    const [createPopupOpen, setCreatePopupOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchBusinesses();
        }
    }, [user, fetchBusinesses]);

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

        const result = await createBusiness({
            name: businessName,
            description: businessDescription || undefined,
            isActive: true,
        });

        if (result.success) {
            alert('success', 'Бизнес успешно создан ✅');
            setBusinessName('');
            setBusinessDescription('');
            setCreatePopupOpen(false);
        } else {
            alert('error', result.error || 'Ошибка создания бизнеса');
        }
    };

    const handleDeleteBusiness = async (id: string) => {
        alert('info', 'Начинаем удаление бизнеса ⏳');

        const result = await deleteBusiness(id);

        if (result.success) {
            alert('success', 'Бизнес успешно удален ✅');
        } else {
            alert('error', result.error || 'Ошибка удаления бизнеса');
        }
    };

    const openEditBusiness = (biz: Business) => {
        setCurrentBusinessId(biz.id);
        setEditBusinessName(biz.name);
        setEditBusinessDescription(biz.description || '');
        setEditMode(true);
    };

    const handleUpdateBusiness = async () => {
        if (!currentBusinessId || !editBusinessName.trim()) {
            alert('info', 'Нет данных для обновления бизнеса');
            return;
        }

        const result = await updateBusiness(currentBusinessId, {
            name: editBusinessName,
            description: editBusinessDescription || undefined,
        });

        if (result.success) {
            setEditMode(false);
            setCurrentBusinessId(null);
            setEditBusinessName('');
            setEditBusinessDescription('');
            alert('success', 'Бизнес успешно обновлен ✅');
        } else {
            alert('error', result.error || 'Ошибка обновления бизнеса');
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
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">Управление бизнесом</h1>

                {loading ? (
                    <div className="flex justify-center">
                        <Spinner />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Список существующих бизнесов */}
                        {businessesData.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-white">Ваши бизнесы</h2>
                                {businessesData.map((business) => (
                                    <motion.div
                                        key={business.id}
                                        className="bg-purple-800 bg-opacity-30 border border-purple-700 rounded-lg p-6"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">{business.name}</h3>
                                                {business.description && (
                                                    <p className="text-purple-300 mt-2">{business.description}</p>
                                                )}
                                                <p className="text-sm text-purple-400 mt-2">
                                                    Статус: {business.isActive ? 'Активен' : 'Неактивен'}
                                                </p>
                                                <p className="text-sm text-purple-400">
                                                    Создан: {new Date(business.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => openEditBusiness(business)}
                                                >
                                                    Редактировать
                                                </Button>
                                                <Button
                                                    onClick={() => handleDeleteBusiness(business.id)}
                                                >
                                                    Удалить
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Кнопка создания нового бизнеса */}
                        <div className="text-center">
                            <Button
                                onClick={() => setCreatePopupOpen(true)}
                            >
                                Создать новый бизнес
                            </Button>
                        </div>
                    </div>
                )}

                {/* Попап создания бизнеса */}
                {createPopupOpen && (
                    <Popup title="Создание бизнеса">
                        <Input
                            type="text"
                            placeholder="Название бизнеса"
                            value={businessName}
                            setValue={setBusinessName}
                            transitionDelay={0.25}
                        />
                        <Input
                            type="text"
                            placeholder="Описание бизнеса (необязательно)"
                            value={businessDescription}
                            setValue={setBusinessDescription}
                            transitionDelay={0.35}
                        />
                        <div className="flex gap-2 mt-4">
                            <Button
                                onClick={handleCreateBusiness}
                                loading={loading}
                                transitionDelay={0.45}
                            >
                                Создать
                            </Button>
                            <Button
                                onClick={() => setCreatePopupOpen(false)}
                                transitionDelay={0.5}
                            >
                                Отмена
                            </Button>
                        </div>
                    </Popup>
                )}

                {/* Попап редактирования бизнеса */}
                {editMode && (
                    <Popup title="Редактирование бизнеса">
                        <Input
                            type="text"
                            placeholder="Название бизнеса"
                            value={editBusinessName}
                            setValue={setEditBusinessName}
                            transitionDelay={0.25}
                        />
                        <Input
                            type="text"
                            placeholder="Описание бизнеса"
                            value={editBusinessDescription}
                            setValue={setEditBusinessDescription}
                            transitionDelay={0.35}
                        />
                        <div className="flex gap-2 mt-4">
                            <Button
                                onClick={handleUpdateBusiness}
                                loading={loading}
                                transitionDelay={0.45}
                            >
                                Сохранить изменения
                            </Button>
                            <Button
                                onClick={() => setEditMode(false)}
                                transitionDelay={0.5}
                            >
                                Отмена
                            </Button>
                        </div>
                    </Popup>
                )}
            </div>
        </LayoutPage>
    );
}