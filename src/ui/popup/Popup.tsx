import {ReactNode} from 'react';
import {motion} from 'framer-motion';

interface PopupProps {
    children: ReactNode;
    title: string;
}

export const Popup = ({children, title}: PopupProps) => {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-950 to-black flex justify-center items-center">
            <motion.div
                className="w-full max-w-md bg-purple-900 bg-opacity-20 backdrop-blur-md p-8 m-6 rounded-2xl shadow-2xl border border-purple-700"
                initial={{opacity: 0, y: 40}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.6, ease: 'easeOut'}}
            >
                <motion.h2
                    className="text-2xl font-bold text-white mb-6 text-center"
                    initial={{opacity: 0, y: -20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 0.2}}
                >
                    {title}
                </motion.h2>
                {children}
            </motion.div>
        </div>
    );
};

