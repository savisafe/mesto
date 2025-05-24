'use client';

import Link from 'next/link';
import {Button} from '@/ui/button/Button';
import React from "react";
import {motion} from "framer-motion";

interface WidgetCardProps {
    title: string;
    children: React.ReactNode;
    link?: string | null;
    buttonText?: string | null;
    className?: string;
}

export const WidgetCard = ({title, children, link, buttonText, className = ''}: WidgetCardProps & {className?: string}) => {
    return (
        <motion.div
            initial={{opacity: 0, y: 40}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: 'easeOut'}}
            className={`h-full ${className}`} // Добавляем h-full
        >
            <div className="bg-purple-800 min-h-60 bg-opacity-30 border border-purple-700 p-6 rounded-xl flex flex-col h-full">
                <div className="flex-grow"> {/* Контент растягивается */}
                    <h2 className="text-lg font-semibold mb-2">{title}</h2>
                    <div className="h-[calc(100%-28px)]"> {/* Вычитаем высоту заголовка */}
                        {children}
                    </div>
                </div>
                {link && buttonText && (
                    <Link href={link} className="mt-4 block"> {/* Уменьшаем отступ */}
                        <Button className="w-full">{buttonText}</Button> {/* Кнопка на всю ширину */}
                    </Link>
                )}
            </div>
        </motion.div>
    );
};