'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, User, LoginRequest, RegisterRequest } from '@/lib/apiClient';

interface AuthContextType {
    accessToken: string | null;
    userName: string | null;
    role: string | null;
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    setAccessToken: (token: string | null) => void;
    login: (credentials: LoginRequest) => Promise<{ success: boolean; error?: string }>;
    register: (userData: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    loginWithEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
    accessToken: null,
    userName: '',
    role: null,
    user: null,
    setUser: () => {},
    loading: true,
    setAccessToken: () => {},
    login: async () => ({ success: false }),
    register: async () => ({ success: false }),
    logout: () => {},
    loginWithEmail: async () => ({ success: false }),
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const defaultName = 'Пользователь';
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [userName, setUserName] = useState(defaultName);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = () => {
            const token = localStorage.getItem('access_token');
            const userData = localStorage.getItem('user_data');
            
            if (token && userData) {
                try {
                    const parsedUser = JSON.parse(userData);
                    setAccessToken(token);
                    setUser(parsedUser);
                    setUserName(parsedUser.name);
                    setRole(parsedUser.role);
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    // Если данные повреждены, очищаем их
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('user_data');
                    setAccessToken(null);
                    setUser(null);
                    setUserName(defaultName);
                    setRole(null);
                }
            } else {
                setAccessToken(null);
                setUser(null);
                setUserName(defaultName);
                setRole(null);
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const handleLogin = async (credentials: LoginRequest) => {
        try {
            const response = await apiClient.login(credentials);
            
            if (response.error) {
                return { success: false, error: response.error };
            }

            if (response.data) {
                const { access_token, user: userData } = response.data;
                setAccessToken(access_token);
                setUser(userData);
                setUserName(userData.name);
                setRole(userData.role);
                
                // Сохраняем данные пользователя в localStorage
                localStorage.setItem('user_data', JSON.stringify(userData));
                
                return { success: true };
            }

            return { success: false, error: 'Неизвестная ошибка' };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Ошибка входа' 
            };
        }
    };

    const handleRegister = async (userData: RegisterRequest) => {
        try {
            const response = await apiClient.register(userData);
            
            if (response.error) {
                return { success: false, error: response.error };
            }

            if (response.data) {
                const { access_token, user: newUser } = response.data;
                setAccessToken(access_token);
                setUser(newUser);
                setUserName(newUser.name);
                setRole(newUser.role);
                
                // Сохраняем данные пользователя в localStorage
                localStorage.setItem('user_data', JSON.stringify(newUser));
                
                return { success: true };
            }

            return { success: false, error: 'Неизвестная ошибка' };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Ошибка регистрации' 
            };
        }
    };

    const handleLogout = () => {
        apiClient.logout();
        localStorage.removeItem('user_data');
        setAccessToken(null);
        setUser(null);
        setUserName(defaultName);
        setRole(null);
    };

    const handleLoginWithEmail = async (email: string) => {
        try {
            const response = await apiClient.loginWithEmail(email);
            
            if (response.error) {
                return { success: false, error: response.error };
            }

            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Ошибка отправки ссылки' 
            };
        }
    };


    return (
        <AuthContext.Provider
            value={{
                accessToken,
                setAccessToken,
                user,
                setUser,
                loading,
                role,
                userName,
                login: handleLogin,
                register: handleRegister,
                logout: handleLogout,
                loginWithEmail: handleLoginWithEmail,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);