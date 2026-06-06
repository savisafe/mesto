import clsx from 'clsx';

interface LogoProps {
    size?: number;
    withWordmark?: boolean;
    className?: string;
}

// Знак повторяет PWA-иконку: монограмма «M» как восходящий график.
export const Logo = ({ size = 36, withWordmark = true, className }: LogoProps) => (
    <span className={clsx('inline-flex items-center gap-2', className)}>
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            role="img"
            aria-label="Mesto"
        >
            <defs>
                <linearGradient id="mesto-logo-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#4f46e5" />
                    <stop offset="0.55" stopColor="#9333ea" />
                    <stop offset="1" stopColor="#ec4899" />
                </linearGradient>
            </defs>
            <rect x="2" y="2" width="96" height="96" rx="24" fill="url(#mesto-logo-grad)" />
            <polyline
                points="16,74 32,34 50,56 68,27 84,74"
                fill="none"
                stroke="#ffffff"
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
        {withWordmark && (
            <span className="text-2xl font-bold text-white">
                Mesto<span className="text-purple-400">.pro</span>
            </span>
        )}
    </span>
);
