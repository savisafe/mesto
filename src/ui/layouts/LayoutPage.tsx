import React from "react";

interface LayoutPageProps {
    children: React.ReactNode;
}

export const LayoutPage = ({children}: LayoutPageProps) => {

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-purple-950 to-black text-white">
            {children}
        </div>
    )
}