export type Role = 'admin' | 'manager' | 'employee' | 'client';

export const roles: Record<Role, Role> = {
    admin: 'admin',
    manager: 'manager',
    employee: 'employee',
    client: 'client'
};
