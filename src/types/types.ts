import {JSX} from "react";

export type Role = 'admin' | 'owner' | 'manager' | 'employee' | 'client';

export const roles: Record<Role, Role> = {
    admin: 'admin',
    owner: 'owner',
    manager: 'manager',
    employee: 'employee',
    client: 'client'
};

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
