import {motion} from "framer-motion";
import Spinner from "@/ui/spinner/Spinner";

interface ButtonProps {
    onClick?: () => void;
    loading?: boolean;
    text: string;
    transitionDelay?: number;
}

export const Button = ({onClick, loading, text, transitionDelay}: ButtonProps) => {
    return (
        <motion.button
            onClick={onClick}
            disabled={loading}
            className="cursor-pointer w-full py-3 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: transitionDelay }}
        >
            {loading ? <Spinner/> : text}
        </motion.button>
    )
}