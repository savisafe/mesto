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

// Ссылка на форму входа/регистрации с сохранением next (куда вернуться после
// авторизации) и предзаполнением email. Используется в письмах-приглашениях,
// в редиректах и при переходах между формами входа и регистрации.
export const authPathWithParams = (
    base: string,
    params: { next?: string; email?: string },
): string => {
    const sp = new URLSearchParams();
    if (params.next) sp.set('next', params.next);
    if (params.email) sp.set('email', params.email);
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
};