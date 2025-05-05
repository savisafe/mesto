import {Eye, EyeOff, Copy} from "lucide-react";
import {motion} from "framer-motion";
import {useState} from "react";

interface InputProps {
    type: string;
    value: string;
    placeholder?: string;
    setValue: (value: string) => void;
    showButton?: boolean;
    transitionDelay?: number;
    showCopyButton?: boolean;
}

export const Input = ({type, placeholder, value, setValue, showButton, transitionDelay, showCopyButton}: InputProps) => {
    const [showPassword, setShowPassword] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
    };

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
            <div className="absolute top-1/2 right-3 transform -translate-y-1/2 flex gap-2">
                {showButton && <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-purple-300 hover:text-white"
                    aria-label="Показать пароль"
                >
                    {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>}
                {showCopyButton && <button
                    type="button"
                    onClick={handleCopy}
                    className="text-purple-300 hover:text-white"
                    aria-label="Копировать"
                >
                    <Copy size={20}/>
                </button>}
            </div>
        </motion.div>
    )
}