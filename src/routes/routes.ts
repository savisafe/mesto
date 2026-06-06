export const routes = {
    HOME: '/',
    LOGIN: '/login',
    LOGIN_OTP: '/login-otp',
    DASHBOARD: '/dashboard',
    MY_BUSINESS: '/my-business',
    CALENDAR: '/calendar',
    REGISTRATION: '/registration',
    CLIENTS: '/clients',
    EMPLOYEES: '/employees',
    REVIEWS: '/reviews',
    FINANCE: '/finance',
    SETTINGS: '/settings',
    SCHEDULE: '/schedule',
    SETTINGS_API: '/settings/api',
    INSTALL: '/install',
}

// Публичная страница онлайн-записи бизнеса по slug.
export const publicBusinessPath = (slug: string) => `/b/${slug}`;