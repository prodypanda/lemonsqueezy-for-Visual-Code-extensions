export interface ValidationResponse {
    success: boolean;
    message: string;
    data?: LemonSqueezyResponse;
}

export interface LemonSqueezyMeta {
    store_id: number;
    product_id: number;
    customer_id: number;
    customer_email?: string;
}

export interface LemonSqueezyInstance {
    id: string;
    name: string;
    created_at: string;
}

export interface LemonSqueezyResponse {
    activated?: boolean;
    deactivated?: boolean;
    valid?: boolean;
    error?: string;
    meta: LemonSqueezyMeta;
    instance?: LemonSqueezyInstance;
    license_key?: {
        id: number;
        status: string;
    };
}

export interface LemonSqueezyErrorResponse {
    error: string;
    status: number;
}

export interface CodeMetrics {
    lines: number;
    chars: number;
    words: number;
    functions: number;
    classes: number;
    complexity: number;
}

export interface LicenseState {
    isLicensed: boolean;
    trialStartDate: string | null;
    licenseKey: string | null;
    instanceId: string | null;
}
