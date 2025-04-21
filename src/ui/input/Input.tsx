import {Eye, EyeOff} from "lucide-react";
import {motion} from "framer-motion";
import {useState} from "react";

interface InputProps {
    type: string;
    value: string;
    placeholder?: string;
    setValue: (value: string) => void;
    showButton?: boolean;
    transitionDelay?: number;
}

export const Input = ({type, placeholder, value, setValue, showButton, transitionDelay}: InputProps) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <motion.div
            className="relative mb-4"
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: transitionDelay}}
        >
            <input
                type={showPassword ? 'text' : type}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 bg-purple-800 text-white placeholder-purple-300 rounded-xl border border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 pr-12"
            />
            {showButton && <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-purple-300 hover:text-white"
                aria-label="Показать пароль"
            >
                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
            </button>}
        </motion.div>
    )
}