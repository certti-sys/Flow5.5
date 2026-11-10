// Defines Types for Payment Module (Frontend)
// Mirrored from Database Schema

export interface Gateway {
    id: string;
    name: string;
    slug: 'mercadopago' | 'stripe' | 'asaas';
    is_active: boolean;
    is_default: boolean;
    created_at: string;
}

export interface GatewayCredentials {
    id: string;
    gateway_id: string;
    env: 'test' | 'live';
    public_key: string;
    secret_key?: string; // Optional because we might not receive it back from API for security
    webhook_secret?: string;
    is_active: boolean;
    allowed_methods?: string[];
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    active: boolean;
    type: 'one_time' | 'subscription';
    price?: number; // Price in cents (from database)
    checkout_config: CheckoutConfig;
    metadata?: any;
    created_at: string;
}

export interface CheckoutConfig {
    banner_url?: string | null;
    logo_url?: string | null;
    primary_color?: string;
    features?: string[];
    [key: string]: any;
}

export interface Price {
    id: string;
    product_id: string;
    nickname?: string;
    currency: string;
    unit_amount: number; // in cents
    type: 'one_time' | 'recurring';
    interval?: 'day' | 'week' | 'month' | 'year';
    interval_count?: number;
    trial_period_days?: number;
    active: boolean;
}
