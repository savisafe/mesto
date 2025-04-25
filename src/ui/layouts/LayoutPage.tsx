
interface LayoutPageProps {
    children: React.ReactNode;
    title?: string;
}

export const LayoutPage = ({children, title}: LayoutPageProps) => {

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-purple-950 to-black text-white">
            <h1 className="text-3xl font-bold mb-6">{title}</h1>
            {children}
        </div>
    )
}