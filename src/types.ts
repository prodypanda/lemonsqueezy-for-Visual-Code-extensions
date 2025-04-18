// Common response interface for consistency
export interface BaseResponse {
    success: boolean;
    message: string;
}

// Enhanced error handling
export interface ExtensionError {
    code: string;
    message: string;
    details?: any;
    timestamp?: string;
    retryable?: boolean;
}

// Add error cleanup config
export interface ErrorTrackingConfig {
    maxErrors: number;
    cleanupInterval: number;  // days
    retainFailedAttempts: boolean;
}

// License validation config
export interface LicenseConfig {
    maxRetries: number;
    retryDelay: number;
    validationInterval: number;
    showNotifications: boolean;
    errorTracking: ErrorTrackingConfig;
    offlineTolerance: number;  // hours
    validateOnStartup: boolean;
    offlineMode: {
        enabled: boolean;
        cacheDuration: number;  // Duration in minutes (changed from hours)
        maxRetries: number;
    };
    apiCache: {
        enabled: boolean;
        duration: number;  // minutes
    };
}

// Extend base response for specific responses
export interface ValidationResponse extends BaseResponse {
    data?: LemonSqueezyResponse;
    error?: string;
}

export interface Base64Result extends BaseResponse {
    result: string;
    error?: string;
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
        key: string;
        activation_limit: number;
        activation_usage: number;
        created_at: string;
        expires_at: string | null;
        test_mode?: boolean;
    };
}

// Error response from LemonSqueezy's API
// Used when something goes wrong with the API call
export interface LemonSqueezyErrorResponse {
    error: string;
    status: number;
}

// Enhanced license state with better tracking
export interface LicenseState extends BaseResponse {
    isLicensed: boolean;
    licenseKey: string | null;
    instanceId: string | null;
    lastValidated?: string;  // ISO date string
    lastValidationSuccess?: boolean;
    validationErrors?: ExtensionError[];
    retryCount: number;
    config: LicenseConfig;
    validUntil?: string;
    data?: LemonSqueezyResponse;  // Add this line to include the API response data
    connectivityStatus: ConnectivityStatus;  // Add this line
}

// Add cache support
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiry: number;
}

export interface ApiCache {
    validations: { [key: string]: CacheEntry<LemonSqueezyResponse> };
    activations: { [key: string]: CacheEntry<LemonSqueezyResponse> };
}

// Add offline mode types
export interface OfflineMode {
    enabled: boolean;
    lastOnlineCheck: string;
    cachedLicenseState: LicenseState;
}

export interface ConnectivityStatus {
    isOnline: boolean;
    tooltipText: string;
}
