// Import required packages and types
import axios from 'axios';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { ValidationResponse, LicenseState } from './types';

/**
 * Main class that handles all license-related features
 * This is like a manager that keeps track of whether someone has paid or is using a trial
 */
export class LicenseManager {
    // There can only be one LicenseManager (this is called a singleton pattern)
    private static instance: LicenseManager;

    // Store important information we need
    private context: vscode.ExtensionContext;        // VS Code's storage system
    private isLicensed: boolean = false;            // Is this a paid user?
    private statusBarItem: vscode.StatusBarItem;    // The button in VS Code's status bar

    // These values are from your LemonSqueezy account
    private readonly STORE_ID = 157343;   // Your store's ID number
    private readonly PRODUCT_ID = 463516;  // Your product's ID number

    // Add rate limiting protection
    private lastValidationCheck: Date = new Date();
    private readonly MIN_VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

    /**
     * Sets up the license manager when it's first created
     * This is private because we only want one instance (singleton pattern)
     */
    private constructor(context: vscode.ExtensionContext) {
        this.context = context;

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

            const response = await axios.post('https://api.lemonsqueezy.com/v1/licenses/validate',
                `license_key=${licenseKey}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            if (!response.data.valid) {
                return { success: false, message: 'Invalid license key.' };
            }

            if (response.data.meta.store_id !== this.STORE_ID) {
                return { success: false, message: 'This license key belongs to a different store.' };
            }

            if (response.data.meta.product_id !== this.PRODUCT_ID) {
                return { success: false, message: 'This license key is for a different product.' };
            }

            return {
                success: true,
                message: 'License key is valid.',
                data: response.data
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
            isLicensed: this.isLicensed,
            licenseKey: this.context.globalState.get('licenseKey') || null,
            instanceId: this.context.globalState.get('instanceId') || null
        };
    }
}
