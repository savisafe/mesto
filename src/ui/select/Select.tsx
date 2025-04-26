'use client';

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from 'lucide-react';

interface Option {
    label: string;
    value: string;
}

interface SelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
}

export const Select = ({ options, value, onChange }: SelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    const selectedLabel = options.find(option => option.value === value)?.label || '';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div ref={selectRef} className="relative w-full max-w-xs">
            <motion.button
                onClick={() => setIsOpen(prev => !prev)}
                className="cursor-pointer w-full p-3 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-xl shadow-md flex items-center justify-between"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {selectedLabel}
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronDown size={20} />
                </motion.div>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="absolute mt-2 w-full bg-purple-700 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto"
                    >
                        {options.map(option => (
                            <div
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className="p-3 hover:bg-purple-600 text-white cursor-pointer"
                            >
                                {option.label}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
