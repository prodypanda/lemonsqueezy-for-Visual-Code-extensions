// Base response interface for all API calls
export interface BaseResponse {
    success: boolean;
    message: string;
}

// Response for license operations
export interface ValidationResponse extends BaseResponse {
    data?: LemonSqueezyResponse;
}

// Information about the store and product where the license was bought
export interface LemonSqueezyMeta {
    store_id: number;      // Which store sold the license
    product_id: number;    // Which product was licensed
    customer_id: number;   // Who bought it
    customer_email?: string;  // Their email (if provided)
}

// Information about a specific installation of the extension
// Each installation gets a unique instance ID
export interface LemonSqueezyInstance {
    id: string;
    name: string;
    created_at: string;
}

// The complete response from LemonSqueezy's API
// Contains all information about a license validation or activation
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

// Error response from LemonSqueezy's API
// Used when something goes wrong with the API call
export interface LemonSqueezyErrorResponse {
    error: string;
    status: number;
}

// Base64 operation result
export interface Base64Result extends BaseResponse {
    result: string;
    error?: string;
}

// License state with enhanced type safety
export interface LicenseState {
    isLicensed: boolean;
    licenseKey: string | null;
    instanceId: string | null;
    lastValidated?: string;  // ISO date string
}
