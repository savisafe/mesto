// API клиент для работы с Mesto Backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ApiResponse<T = unknown> {
    data?: T;
    error?: string;
    message?: string;
}

export enum roles {
    admin = 'ADMIN', owner = 'OWNER', manager = 'MANAGER', employee = 'EMPLOYEE', client = 'CLIENT'
};

export interface User {
    id: string;
    email: string;
    name: string;
    role: roles;
    isEmailVerified?: boolean;
    lastLoginAt?: string;
}

export interface Business {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    owner?: User;
    managers?: User[];
    employees?: User[];
}

export interface AuthResponse {
    access_token: string;
    user: User;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    phone?: string;
}

export interface CreateBusinessRequest {
    name: string;
    description?: string;
    isActive?: boolean;
}

export interface UpdateBusinessRequest {
    name?: string;
    description?: string;
    isActive?: boolean;
}

class ApiClient {
    private baseURL: string;
    private token: string | null = null;

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL;
        this.loadTokenFromStorage();
    }

    private loadTokenFromStorage() {
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('access_token');
        }
    }

    setToken(token: string | null) {
        this.token = token;
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem('access_token', token);
            } else {
                localStorage.removeItem('access_token');
            }
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseURL}${endpoint}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    error: data.message || `HTTP ${response.status}: ${response.statusText}`,
                };
            }

            return {data};
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }

    // Auth endpoints
    async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
        const response = await this.request<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });

        if (response.data?.access_token) {
            this.setToken(response.data.access_token);
        }

        return response;
    }

    async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
        const response = await this.request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        if (response.data?.access_token) {
            this.setToken(response.data.access_token);
        }

        return response;
    }

    async loginWithEmail(email: string): Promise<ApiResponse<{ message: string }>> {
        return this.request<{ message: string }>('/auth/login/email', {
            method: 'POST',
            body: JSON.stringify({email}),
        });
    }

    async verifyEmail(token: string): Promise<ApiResponse<{ message: string; user: User }>> {
        return this.request<{ message: string; user: User }>(`/auth/verify-email/${token}`);
    }

    async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
        return this.request<{ message: string }>('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({email}),
        });
    }

    logout() {
        this.setToken(null);
    }

    // Business endpoints
    async getBusinesses(): Promise<ApiResponse<Business[]>> {
        return this.request<Business[]>('/businesses');
    }

    async getBusiness(id: string): Promise<ApiResponse<Business>> {
        return this.request<Business>(`/businesses/${id}`);
    }

    async createBusiness(businessData: CreateBusinessRequest): Promise<ApiResponse<Business>> {
        return this.request<Business>('/businesses', {
            method: 'POST',
            body: JSON.stringify(businessData),
        });
    }

    async updateBusiness(id: string, businessData: UpdateBusinessRequest): Promise<ApiResponse<Business>> {
        return this.request<Business>(`/businesses/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(businessData),
        });
    }

    async deleteBusiness(id: string): Promise<ApiResponse<{ message: string }>> {
        return this.request<{ message: string }>(`/businesses/${id}`, {
            method: 'DELETE',
        });
    }

    // Utility methods
    isAuthenticated(): boolean {
        return !!this.token;
    }

    getToken(): string | null {
        return this.token;
    }
}

// Создаем единственный экземпляр API клиента
export const apiClient = new ApiClient();
export default apiClient;
