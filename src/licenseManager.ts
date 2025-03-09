// Import required packages and types
import axios from 'axios';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { ValidationResponse, LicenseState, LicenseConfig, ExtensionError, ErrorTrackingConfig, ApiCache, CacheEntry, OfflineMode } from './types';

/**
 * LemonSqueezy License Manager for VS Code Extensions
 * Handles all license operations through LemonSqueezy's API
 */
export class LicenseManager {
    // There can only be one LicenseManager (this is called a singleton pattern)
    private static instance: LicenseManager;

    // Store important information we need
    private context: vscode.ExtensionContext;        // VS Code's storage system
    private isLicensed: boolean = false;            // Is this a paid user?
    private statusBarItem: vscode.StatusBarItem;    // The button in VS Code's status bar

    // API endpoints from LemonSqueezy
    private readonly API = {
        validate: 'https://api.lemonsqueezy.com/v1/licenses/validate',
        activate: 'https://api.lemonsqueezy.com/v1/licenses/activate',
        deactivate: 'https://api.lemonsqueezy.com/v1/licenses/deactivate'
    };

    // Replace with your LemonSqueezy credentials
    private readonly STORE_ID = 157343;   // Your store ID
    private readonly PRODUCT_ID = 463516;  // Your product ID

    // Add rate limiting protection
    private lastValidationCheck: Date = new Date();
    private readonly MIN_VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

    private retryAttempts = 0;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 5000; // 5 seconds

    private config: LicenseConfig = {
        maxRetries: 3,
        retryDelay: 5000,
        validationInterval: 24,
        showNotifications: true,
        errorTracking: {
            maxErrors: 100,
            cleanupInterval: 7,
            retainFailedAttempts: false
        },
        offlineTolerance: 72,
        validateOnStartup: true,
        offlineMode: {
            enabled: true,
            cacheDuration: 72,
            maxRetries: 3
        },
        apiCache: {
            enabled: true,
            duration: 30
        }
    };

    private validationErrors: ExtensionError[] = [];
    private cleanupInterval: NodeJS.Timer | null = null;
    private readonly DEFAULT_CONFIG: LicenseConfig = {
        maxRetries: 3,
        retryDelay: 5000,
        validationInterval: 24,
        showNotifications: true,
        errorTracking: {
            maxErrors: 100,
            cleanupInterval: 7,
            retainFailedAttempts: false
        },
        offlineTolerance: 72,
        validateOnStartup: true,
        offlineMode: {
            enabled: true,
            cacheDuration: 72,
            maxRetries: 3
        },
        apiCache: {
            enabled: true,
            duration: 30
        }
    };

    private apiCache: ApiCache = { validations: {}, activations: {} };
    private offlineMode: OfflineMode = {
        enabled: false,
        lastOnlineCheck: new Date().toISOString(),
        cachedLicenseState: {
            success: true,
            message: 'Initial offline state',
            isLicensed: false,
            licenseKey: null,
            instanceId: null,
            retryCount: 0,
            config: this.DEFAULT_CONFIG
        }
    };

    /**
     * Sets up the license manager when it's first created
     * This is private because we only want one instance (singleton pattern)
     */
    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadConfig();

        // Create status bar with highest priority
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100000  // Very high priority to ensure visibility
        );

        // Load saved states
        const licenseKey = this.context.globalState.get('licenseKey');
        this.isLicensed = !!licenseKey;

        // Initialize status bar immediately
        this.updateStatusBarItem();
        this.ensureStatusBarVisibility();

        // Register window state change listener
        context.subscriptions.push(
            vscode.window.onDidChangeWindowState(() => {
                this.ensureStatusBarVisibility();
            })
        );

        // Ensure status bar is disposed properly
        context.subscriptions.push(this.statusBarItem);

        this.startErrorCleanup();
        this.initializeCache();
    }

    private startErrorCleanup(): void {
        const { cleanupInterval } = this.config.errorTracking;
        this.cleanupInterval = setInterval(() => {
            this.cleanupErrors();
        }, cleanupInterval * 24 * 60 * 60 * 1000);
    }

    private cleanupErrors(): void {
        const { maxErrors, retainFailedAttempts } = this.config.errorTracking;
        const now = new Date();

        this.validationErrors = this.validationErrors
            .filter(error => {
                if (!error.timestamp) return false;
                const age = now.getTime() - new Date(error.timestamp).getTime();
                const keepError = age < this.config.errorTracking.cleanupInterval * 24 * 60 * 60 * 1000;
                return keepError || (retainFailedAttempts && error.code === 'VALIDATION_FAILED');
            })
            .slice(-maxErrors);
    }

    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('featureRich.license');
        this.config = {
            ...this.DEFAULT_CONFIG,
            ...config
        };
    }

    private logError(error: ExtensionError): void {
        this.validationErrors.push({
            ...error,
            timestamp: new Date().toISOString()
        });
        if (this.config.showNotifications) {
            vscode.window.showErrorMessage(error.message);
        }
    }

    /**
     * Get the one and only instance of LicenseManager
     * This is how other parts of the code access the license manager
     */
    static getInstance(context: vscode.ExtensionContext): LicenseManager {
        if (!LicenseManager.instance) {
            LicenseManager.instance = new LicenseManager(context);
        }
        return LicenseManager.instance;
    }

    /**
     * Checks if a license key is valid with LemonSqueezy
     * 
     * Steps:
     * 1. Sends the key to LemonSqueezy
     * 2. Checks if it's a valid key
     * 3. Makes sure it's for our store and ccorrect product
     * 
     * Like checking if a gift card is real and for our store
     */
    private async validateLicenseKey(licenseKey: string): Promise<ValidationResponse> {
        try {
            if (!licenseKey?.match(/^[a-zA-Z0-9-]+$/)) {
                return { success: false, message: 'Invalid license key format.' };
            }

            const response = await this.makeApiRequest(this.API.validate,
                `license_key=${licenseKey}`);

            if (!response.valid) {
                return { success: false, message: 'Invalid license key.' };
            }

            if (response.meta.store_id !== this.STORE_ID) {
                return { success: false, message: 'This license key belongs to a different store.' };
            }

            if (response.meta.product_id !== this.PRODUCT_ID) {
                return { success: false, message: 'This license key is for a different product.' };
            }

            return {
                success: true,
                message: 'License key is valid.',
                data: response
            };
        } catch (error) {
            return this.handleAxiosError(error);
        }
    }

    /**
     * Activates a license key for this installation
     * 
     * Steps:
     * 1. First checks if the key is valid
     * 2. Creates a unique ID for this installation
     * 3. Tells LemonSqueezy we're using the license
     * 4. Saves the license info locally
     * 
     * Like activating a product key for software
     */
    async activateLicense(licenseKey: string): Promise<ValidationResponse> {
        // First validate the license key
        const validationResult = await this.validateLicenseKey(licenseKey);
        if (!validationResult.success) {
            return validationResult;
        }

        // If validation passed, proceed with activation
        const instanceName = `vscode-${uuidv4()}`;

        try {
            const response = await axios.post('https://api.lemonsqueezy.com/v1/licenses/activate',
                `license_key=${licenseKey}&instance_name=${instanceName}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            if (response.data.activated) {
                await this.context.globalState.update('licenseKey', licenseKey);
                await this.context.globalState.update('instanceId', response.data.instance.id);
                this.isLicensed = true;
                this.updateStatusBarItem();
                return { success: true, message: 'License activated successfully!' };
            }

            return { success: false, message: 'License activation failed.' };
        } catch (error) {
            return this.handleAxiosError(error);
        }
    }

    /**
     * Updates the button in VS Code's status bar
     * Shows if you're using free/premium version
     * 
     * States:
     * - Free: Basic version
     * - Premium: Paid version with all features
     */
    public updateStatusBarItem(): void {
        if (!this.statusBarItem) {
            return;
        }

        if (this.isLicensed) {
            this.statusBarItem.text = "$(verified) Premium";
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        } else {
            this.statusBarItem.text = "$(star) Free";
            this.statusBarItem.backgroundColor = undefined;
        }

        this.statusBarItem.command = 'extension.activateLicense';
        this.statusBarItem.tooltip = this.isLicensed ?
            "Premium features activated" :
            "Click to activate premium features";

        this.ensureStatusBarVisibility();
    }

    /**
     * Makes sure the status bar button stays visible
     * Sometimes VS Code needs a little extra help showing our button
     */
    private ensureStatusBarVisibility(): void {
        if (this.statusBarItem) {
            this.statusBarItem.show();
            // Force a small delay to ensure visibility
            setTimeout(() => {
                this.statusBarItem.show();
            }, 100);
        }
    }

    /**
     * Validates the currently stored license
     * @returns Whether the license is valid
     */
    public async validateLicense(): Promise<boolean> {
        // Check offline mode first
        if (this.offlineMode.enabled) {
            return this.handleOfflineValidation();
        }

        return this.withRetry(async () => {
            // Add rate limiting
            const now = new Date();
            if (now.getTime() - this.lastValidationCheck.getTime() < this.MIN_VALIDATION_INTERVAL) {
                return this.isLicensed;
            }
            this.lastValidationCheck = now;

            const licenseKey = this.context.globalState.get('licenseKey');
            const instanceId = this.context.globalState.get('instanceId');

            if (!licenseKey || !instanceId) {
                return false;
            }

            try {
                const response = await axios.post('https://api.lemonsqueezy.com/v1/licenses/validate',
                    `license_key=${licenseKey}&instance_id=${instanceId}`,
                    {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                );

                if (response.data.valid &&
                    response.data.meta.store_id === this.STORE_ID &&
                    response.data.meta.product_id === this.PRODUCT_ID) {
                    this.isLicensed = true;
                    this.updateStatusBarItem();
                    await this.context.globalState.update('lastValidated', new Date().toISOString());
                    return true;
                }

                this.isLicensed = false;
                this.updateStatusBarItem();
                return false;
            } catch (error) {
                return false;
            }
        });
    }

    private async handleOfflineValidation(): Promise<boolean> {
        if (!this.offlineMode.cachedLicenseState) return false;
        const offlineExpiry = new Date(this.offlineMode.lastOnlineCheck);
        offlineExpiry.setHours(offlineExpiry.getHours() + this.config.offlineMode.cacheDuration);
        return Date.now() < offlineExpiry.getTime() && this.offlineMode.cachedLicenseState.isLicensed;
    }

    /**
     * Deactivates the current license
     * @returns Deactivation response
     */
    async deactivateLicense(): Promise<ValidationResponse> {
        const licenseKey = this.context.globalState.get('licenseKey');
        const instanceId = this.context.globalState.get('instanceId');

        if (!licenseKey || !instanceId) {
            return { success: false, message: 'No active license found.' };
        }

        try {
            const response = await axios.post('https://api.lemonsqueezy.com/v1/licenses/deactivate',
                `license_key=${licenseKey}&instance_id=${instanceId}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            if (response.data.deactivated) {
                await this.context.globalState.update('licenseKey', undefined);
                await this.context.globalState.update('instanceId', undefined);
                this.isLicensed = false;
                this.updateStatusBarItem();
                return { success: true, message: 'License deactivated successfully!' };
            }
            return { success: false, message: 'Failed to deactivate license.' };
        } catch (error) {
            return this.handleAxiosError(error);
        }
    }

    /**
     * Checks if premium features are available
     * @returns Whether premium features can be accessed
     */
    isFeatureAvailable(): boolean {
        return this.isLicensed;
    }

    /**
     * Checks the subscription status of a license
     * @param licenseKey The license key to check
     * @returns Whether the subscription is active
     */
    private async checkSubscriptionStatus(licenseKey: string): Promise<boolean> {
        try {
            const response = await axios.get(`https://api.lemonsqueezy.com/v1/licenses/${licenseKey}/status`);
            return response.data?.valid && !response.data?.expired;
        } catch {
            return false;
        }
    }

    /**
     * Starts checking the license regularly
     * Makes sure people can't keep using premium features if their license expires
     */
    startPeriodicValidation(): void {
        setInterval(async () => {
            if (this.isLicensed) {
                await this.validateLicense();
            }
        }, 24 * 60 * 60 * 1000); // Check every 24 hours
    }

    /**
     * Handles any errors that happen when talking to LemonSqueezy
     * Makes error messages more user-friendly
     */
    private async handleAxiosError(error: any): Promise<ValidationResponse> {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.error || error.message;
            return { success: false, message: `API Error: ${message}` };
        }
        return { success: false, message: 'An unexpected error occurred' };
    }

    /**
     * Gets the current license state
     * @returns Current license state
     */
    getLicenseState(): LicenseState {
        return {
            success: true,  // Add required BaseResponse property
            message: 'License state retrieved successfully',  // Add required BaseResponse property
            isLicensed: this.isLicensed,
            licenseKey: this.context.globalState.get('licenseKey') || null,
            instanceId: this.context.globalState.get('instanceId') || null,
            lastValidated: this.context.globalState.get('lastValidated'),
            lastValidationSuccess: this.isLicensed,
            validationErrors: this.validationErrors,
            retryCount: this.retryAttempts,
            config: this.config,
            validUntil: this.context.globalState.get('validUntil')
        };
    }

    // Add retry mechanism
    private async withRetry<T>(operation: () => Promise<T>, retryable = true): Promise<T> {
        for (let i = 0; i < this.config.maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                const isLastAttempt = i === this.config.maxRetries - 1;
                this.logError({
                    code: 'RETRY_ERROR',
                    message: `Operation failed (attempt ${i + 1}/${this.config.maxRetries})`,
                    details: error,
                    retryable
                });
                if (isLastAttempt || !retryable) throw error;
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
            }
        }
        throw new Error('Max retries reached');
    }

    private async initializeCache(): Promise<void> {
        this.apiCache = await this.context.globalState.get('apiCache') || { validations: {}, activations: {} };
        this.offlineMode = await this.context.globalState.get('offlineMode') || this.offlineMode;
    }

    private getCachedResponse<T>(cache: { [key: string]: CacheEntry<T> }, key: string): T | null {
        const entry = cache[key];
        if (!entry) return null;
        if (Date.now() > entry.expiry) {
            delete cache[key];
            return null;
        }
        return entry.data;
    }

    private setCachedResponse<T>(cache: { [key: string]: CacheEntry<T> }, key: string, data: T): void {
        const duration = this.config.apiCache.duration * 60 * 1000;
        cache[key] = {
            data,
            timestamp: Date.now(),
            expiry: Date.now() + duration
        };
        this.context.globalState.update('apiCache', this.apiCache);
    }

    /**
     * Make API request with proper headers and error handling
     */
    private async makeApiRequest(endpoint: string, data: any): Promise<any> {
        try {
            const response = await axios.post(endpoint, data, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                }
                throw new Error(error.response?.data?.error || error.message);
            }
            throw error;
        }
    }

    public dispose(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        if (this.statusBarItem) {
            this.statusBarItem.dispose();
        }
    }
}
