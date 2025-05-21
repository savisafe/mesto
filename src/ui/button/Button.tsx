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
            className="text-xs sm:text-lg cursor-pointer w-full p-3 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: transitionDelay }}
        >
            {loading ? <Spinner /> : children}
        </motion.button>
    );
};
