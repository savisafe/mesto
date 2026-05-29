'use client';

import {LayoutPage} from "@/ui/layouts/LayoutPage";
import {TextField} from "@/ui/form";
import {useEffect, useState} from "react";
import {Button} from "@/ui/button/Button";
import {useAccess} from "@/hooks/useAccess";
import type { Business } from "@/db/schema";
import {Modal} from "@/ui/modal/Modal";
import {useAuth} from "@/contexts/AuthContext";
import {useNotification} from "@/contexts/NotificationContext";
import {useBusiness} from "@/contexts/BusinessContext";
import Spinner from "@/ui/spinner/Spinner";
import { motion } from "framer-motion";

export default function MyBusinessPage() {
    const alert = useNotification();
    const {user} = useAuth();
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
        if (!businessName.trim()) {
            alert('error', 'Название бизнеса не заполнено');
            return;
        }

        // Авторизация и роль проверяются на сервере в services/businesses.createBusiness.
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
                <Modal
                    open={createPopupOpen}
                    onClose={() => setCreatePopupOpen(false)}
                    title="Создание бизнеса"
                    footer={
                        <>
                            <button
                                onClick={() => setCreatePopupOpen(false)}
                                className="px-4 py-2.5 text-purple-200 hover:text-white text-sm cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleCreateBusiness}
                                disabled={loading}
                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl text-white font-medium cursor-pointer transition"
                            >
                                {loading ? 'Создание...' : 'Создать'}
                            </button>
                        </>
                    }
                >
                    <TextField
                        label="Название бизнеса"
                        value={businessName}
                        onChange={setBusinessName}
                        autoFocus
                    />
                    <TextField
                        label="Описание"
                        hint="Необязательно — короткое описание для команды"
                        value={businessDescription}
                        onChange={setBusinessDescription}
                    />
                </Modal>

                <Modal
                    open={editMode}
                    onClose={() => setEditMode(false)}
                    title="Редактирование бизнеса"
                    footer={
                        <>
                            <button
                                onClick={() => setEditMode(false)}
                                className="px-4 py-2.5 text-purple-200 hover:text-white text-sm cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleUpdateBusiness}
                                disabled={loading}
                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl text-white font-medium cursor-pointer transition"
                            >
                                {loading ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </>
                    }
                >
                    <TextField
                        label="Название бизнеса"
                        value={editBusinessName}
                        onChange={setEditBusinessName}
                    />
                    <TextField
                        label="Описание"
                        value={editBusinessDescription}
                        onChange={setEditBusinessDescription}
                    />
                </Modal>
            </div>
        </LayoutPage>
    );
}