import {motion} from "framer-motion";
import Link from "next/link";
import {WidgetConfig} from "@/types/types";

interface DashboardWidgetProps {
    widgets: WidgetConfig[];
}

export const DashboardWidget = ({widgets}: DashboardWidgetProps) => {
    return(
        <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}>
            {widgets.map(widget => (
                <div key={widget.id} className="bg-purple-800 min-h-60 bg-opacity-30 border border-purple-700 p-6 rounded-xl flex flex-col justify-between">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold mb-2">{widget.title}</h2>
                        {widget.content}
                    </div>
                    {widget.link && (
                        <Link href={widget.link}>
                            <button className="cursor-pointer w-full bg-purple-700 hover:bg-purple-600 py-2 rounded">
                                {widget.buttonText}
                            </button>
                        </Link>
                    )}
                </div>
            ))}
        </motion.div>
    )
}