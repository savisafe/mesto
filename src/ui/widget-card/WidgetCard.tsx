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
}

export const WidgetCard = ({title, children, link, buttonText}: WidgetCardProps) => {
    return (
        <motion.div
            initial={{opacity: 0, y: 40}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: 'easeOut'}}>

            <div className="bg-purple-800 min-h-60 bg-opacity-30 border border-purple-700 p-6 rounded-xl flex flex-col justify-between">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold mb-2">{title}</h2>
                    {children}
                </div>
                {link && buttonText && (
                    <Link href={link} className="mt-6">
                        <Button>{buttonText}</Button>
                    </Link>
                )}
            </div>
        </motion.div>
    );
};
