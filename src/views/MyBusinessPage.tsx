'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutPage } from '@/ui/layouts/LayoutPage';
import { TextField } from '@/ui/form';
import { Button } from '@/ui/button/Button';
import { Modal } from '@/ui/modal/Modal';
import { useAccess } from '@/hooks/useAccess';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useBusiness } from '@/contexts/BusinessContext';
import Spinner from '@/ui/spinner/Spinner';
import { ARCHIVE_RETENTION_DAYS, daysUntilPurge, dayWord } from '@/lib/archive';
import type { Business } from '@/db/schema';

export default function MyBusinessPage() {
    const alert = useNotification();
    const { user } = useAuth();
    const {
        businessesData,
        archivedBusinesses,
        loading,
        createBusiness,
        updateBusiness,
        archiveBusiness,
        unarchiveBusiness,
        fetchBusinesses,
        fetchArchivedBusinesses,
    } = useBusiness();
    const { hasAccess } = useAccess();

    const [businessName, setBusinessName] = useState('');
    const [businessDescription, setBusinessDescription] = useState('');
    const [createPopupOpen, setCreatePopupOpen] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
    const [editBusinessName, setEditBusinessName] = useState('');
    const [editBusinessDescription, setEditBusinessDescription] = useState('');

    const [archiveTarget, setArchiveTarget] = useState<Business | null>(null);

    useEffect(() => {
        if (user) {
            fetchBusinesses();
            fetchArchivedBusinesses();
        }
    }, [user, fetchBusinesses, fetchArchivedBusinesses]);

    const handleCreateBusiness = async () => {
        if (!businessName.trim()) {
            alert('error', 'Название бизнеса не заполнено');
            return;
        }

        const result = await createBusiness({
            name: businessName,
            description: businessDescription || undefined,
        });

        if (result.success) {
            alert('success', 'Бизнес создан');
            setBusinessName('');
            setBusinessDescription('');
            setCreatePopupOpen(false);
        } else {
            alert('error', result.error || 'Ошибка создания бизнеса');
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
            alert('error', 'Название не может быть пустым');
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
            alert('success', 'Бизнес обновлён');
        } else {
            alert('error', result.error || 'Ошибка обновления бизнеса');
        }
    };

    const handleArchive = async () => {
        if (!archiveTarget) return;
        const result = await archiveBusiness(archiveTarget.id);
        if (result.success) {
            alert('success', `Бизнес «${archiveTarget.name}» в архиве на ${ARCHIVE_RETENTION_DAYS} дней`);
            setArchiveTarget(null);
        } else {
            alert('error', result.error || 'Ошибка архивации');
        }
    };

    const handleUnarchive = async (biz: Business) => {
        const result = await unarchiveBusiness(biz.id);
        if (result.success) {
            alert('success', `Бизнес «${biz.name}» восстановлен`);
        } else {
            alert('error', result.error || 'Ошибка восстановления');
        }
    };

    if (!hasAccess) {
        return (
            <LayoutPage>
                <div className="text-center text-red-400">У вас нет доступа к этой странице</div>
            </LayoutPage>
        );
    }

    return (
        <LayoutPage>
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                        <p className="text-purple-300 text-sm mb-1">Управление</p>
                        <h1 className="text-4xl font-bold text-white tracking-tight">Бизнесы</h1>
                    </div>
                    <div className="w-56">
                        <Button onClick={() => setCreatePopupOpen(true)}>Новый бизнес</Button>
                    </div>
                </header>

                {loading && businessesData.length === 0 ? (
                    <div className="flex justify-center py-16">
                        <Spinner />
                    </div>
                ) : (
                    <>
                        <section className="space-y-3 mb-10">
                            {businessesData.length === 0 ? (
                                <div className="bg-white/5 border border-purple-700/40 rounded-2xl p-8 text-center">
                                    <p className="text-white mb-2">Пока нет бизнесов</p>
                                    <p className="text-purple-300 text-sm">
                                        Создайте первый, чтобы начать работу.
                                    </p>
                                </div>
                            ) : (
                                businessesData.map((business) => (
                                    <motion.article
                                        key={business.id}
                                        className="bg-white/5 backdrop-blur border border-purple-700/40 rounded-2xl p-5"
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="flex flex-wrap justify-between items-start gap-4">
                                            <div className="min-w-0">
                                                <h3 className="text-lg font-semibold text-white">
                                                    {business.name}
                                                </h3>
                                                {business.description && (
                                                    <p className="text-purple-300 text-sm mt-1.5">
                                                        {business.description}
                                                    </p>
                                                )}
                                                <p className="text-xs text-purple-400 mt-3">
                                                    Создан {new Date(business.createdAt).toLocaleDateString('ru-RU')}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openEditBusiness(business)}
                                                    className="px-3 py-1.5 text-sm text-purple-200 hover:text-white border border-purple-700/40 hover:border-purple-500 rounded-lg cursor-pointer transition"
                                                >
                                                    Редактировать
                                                </button>
                                                <button
                                                    onClick={() => setArchiveTarget(business)}
                                                    className="px-3 py-1.5 text-sm text-purple-300 hover:text-red-400 cursor-pointer"
                                                >
                                                    Архивировать
                                                </button>
                                            </div>
                                        </div>
                                    </motion.article>
                                ))
                            )}
                        </section>

                        {archivedBusinesses.length > 0 && (
                            <section>
                                <h2 className="text-purple-300 text-xs uppercase tracking-wider font-medium mb-3">
                                    Архив
                                </h2>
                                <p className="text-purple-400 text-sm mb-3">
                                    Архивные бизнесы автоматически удаляются через{' '}
                                    {ARCHIVE_RETENTION_DAYS} дней с момента архивации.
                                </p>
                                <div className="space-y-2">
                                    {archivedBusinesses.map((biz) => (
                                        <ArchivedRow
                                            key={biz.id}
                                            business={biz}
                                            onRestore={() => handleUnarchive(biz)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}

                <Modal
                    open={createPopupOpen}
                    onClose={() => setCreatePopupOpen(false)}
                    title="Новый бизнес"
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

                <Modal
                    open={archiveTarget !== null}
                    onClose={() => setArchiveTarget(null)}
                    title="Архивировать бизнес"
                    size="sm"
                    footer={
                        <>
                            <button
                                onClick={() => setArchiveTarget(null)}
                                className="px-4 py-2.5 text-purple-200 hover:text-white text-sm cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleArchive}
                                disabled={loading}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl text-white font-medium cursor-pointer transition"
                            >
                                Архивировать
                            </button>
                        </>
                    }
                >
                    <p className="text-white mb-3">
                        Бизнес <strong>{archiveTarget?.name}</strong> будет скрыт из основного
                        списка и доступен только в разделе «Архив».
                    </p>
                    <p className="text-purple-300 text-sm">
                        Через {ARCHIVE_RETENTION_DAYS} дней он будет окончательно удалён
                        вместе со всеми клиентами, услугами и записями. До этого вы можете
                        восстановить его в один клик.
                    </p>
                </Modal>
            </div>
        </LayoutPage>
    );
}

function ArchivedRow({ business, onRestore }: { business: Business; onRestore: () => void }) {
    const archivedAt = business.archivedAt ? new Date(business.archivedAt) : null;
    const daysLeft = daysUntilPurge(archivedAt);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.03] border border-purple-800/40 rounded-2xl p-4">
            <div className="min-w-0">
                <p className="text-purple-200 font-medium truncate">{business.name}</p>
                <p className="text-purple-400 text-xs mt-0.5">
                    {daysLeft === null
                        ? 'В архиве'
                        : daysLeft === 0
                          ? 'Будет удалён сегодня'
                          : `Удалится через ${daysLeft} ${dayWord(daysLeft)}`}
                </p>
            </div>
            <button
                onClick={onRestore}
                className="px-3 py-1.5 text-sm text-purple-200 hover:text-white border border-purple-700/40 hover:border-purple-500 rounded-lg cursor-pointer transition"
            >
                Восстановить
            </button>
        </div>
    );
}
