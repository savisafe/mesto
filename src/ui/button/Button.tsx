import { motion } from "framer-motion";
import Spinner from "@/ui/spinner/Spinner";
import { ReactNode } from "react";

interface ButtonProps {
    onClick?: () => void;
    loading?: boolean;
    children: ReactNode;
    transitionDelay?: number;
}

export const Button = ({ onClick, loading, children, transitionDelay }: ButtonProps) => {
    return (
        <motion.button
            onClick={onClick}
            disabled={loading}
            className="text-xs sm:text-sm md:text-base lg:text-lg cursor-pointer w-full px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-xl transition disabled:opacity-50 break-words"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: transitionDelay }}
            style={{ lineHeight: '1.2' }} // Оптимальный межстрочный интервал
        >
            {loading ? <Spinner /> : children}
        </motion.button>
    );
};
