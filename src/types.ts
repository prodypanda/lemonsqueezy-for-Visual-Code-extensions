// This interface defines what we get back when checking a license
// Think of it like a receipt that tells us if everything worked
export interface ValidationResponse {
    success: boolean;      // Did it work? (true/false)
    message: string;       // Message explaining what happened
    data?: LemonSqueezyResponse;  // Extra details from LemonSqueezy (optional)
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

// Stores various statistics about the code being analyzed
// Used by the premium metrics feature
export interface CodeMetrics {
    lines: number;
    chars: number;
    words: number;
    functions: number;
    classes: number;
    complexity: number;
}

// Current state of the license in the extension
// Used to track if premium features are available
export interface LicenseState {
    isLicensed: boolean;
    licenseKey: string | null;
    instanceId: string | null;
}
