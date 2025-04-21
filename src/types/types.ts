export type Role = 'admin' | 'manager' | 'master' | 'client';

export const roles: Record<Role, Role> = {
    admin: 'admin',
    manager: 'manager',
    master: 'master',
    client: 'client'
};
