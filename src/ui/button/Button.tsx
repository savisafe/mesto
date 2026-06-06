import { motion } from "framer-motion";
import Spinner from "@/ui/spinner/Spinner";
import { ReactNode } from "react";

interface ButtonProps {
    onClick?: () => void;
    type?: 'button' | 'submit';
    loading?: boolean;
    disabled?: boolean;
    children: ReactNode;
    transitionDelay?: number;
}

export const Button = ({ onClick, type = 'button', loading, disabled, children, transitionDelay }: ButtonProps) => {
    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={loading || disabled}
            className="text-xs sm:text-lg cursor-pointer w-full p-3 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: transitionDelay }}
        >
            {loading ? <Spinner /> : children}
        </motion.button>
    );
};
