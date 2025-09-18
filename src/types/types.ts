import {JSX} from "react";

export interface Business {
    id: string;
    name: string;
}

export interface RecordEntry { time: string; client: string; master: string; }
export interface EmployeeStatus { name: string; label: string; }
export interface Review { rating: number; comment: string; client: string; }

export interface WidgetConfig {
    id: string;
    title: string;
    content: JSX.Element;
    link: string | null;
    buttonText?: string;
}
