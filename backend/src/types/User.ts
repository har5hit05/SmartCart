// User entity types

export interface User {
    id: number;
    email: string;
    password_hash?: string;
    full_name: string;
    google_id?: string;
    profile_picture?: string;
    role: 'customer' | 'admin';
    is_email_verified: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateUserDTO {
    email: string;
    password: string;
    full_name: string;
}

export interface UserResponse {
    id: number;
    email: string;
    full_name: string;
    profile_picture?: string;
    role: 'customer' | 'admin';
    is_email_verified: boolean;
    created_at: Date;
}

export interface LoginDTO {
    email: string;
    password: string;
}

export interface RefreshToken {
    id: number;
    user_id: number;
    token: string;
    expires_at: Date;
    created_at: Date;
}

export interface AuthResponse {
    user: UserResponse;
    accessToken: string;
    refreshToken: string;
}