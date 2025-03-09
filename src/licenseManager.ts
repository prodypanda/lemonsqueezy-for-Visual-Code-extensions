import axios from 'axios';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { ValidationResponse, LicenseState } from './types';

export class LicenseManager {
    private static instance: LicenseManager;
    private context: vscode.ExtensionContext;
    private isLicensed: boolean = false;
    private statusBarItem: vscode.StatusBarItem;

    // Hardcoded values for security
    private readonly STORE_ID = 157343; // Replace with your store ID
    private readonly PRODUCT_ID = 463516; // Replace with your product ID
    private readonly TRIAL_PERIOD_DAYS = 14;
    private trialStartDate: Date | null = null;

    /**
     * Private constructor for singleton pattern
     * @param context The extension context
     */
    private constructor(context: vscode.ExtensionContext) {
        this.context = context;

        // Create status bar with highest priority
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100000  // Very high priority to ensure visibility
        );

        // Load saved states
        const savedDate = this.context.globalState.get<string>('trialStartDate');
        this.trialStartDate = savedDate ? new Date(savedDate) : null;
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
     * Ensures the status bar item remains visible
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
     * Gets or creates the singleton instance of LicenseManager
     * @param context The extension context
     * @returns The LicenseManager instance
     */
    static getInstance(context: vscode.ExtensionContext): LicenseManager {
        if (!LicenseManager.instance) {
            LicenseManager.instance = new LicenseManager(context);
        }
        return LicenseManager.instance;
    }

    /**
     * Validates a license key with the LemonSqueezy API
     * @param licenseKey The license key to validate 
     * @returns Validation response
     */
    private async validateLicenseKey(licenseKey: string): Promise<ValidationResponse> {
        try {
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
     * Activates a license key for this instance
     * @param licenseKey The license key to activate
     * @returns Activation response
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
     * Validates the currently stored license
     * @returns Whether the license is valid
     */
    async validateLicense(): Promise<boolean> {
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
     * Updates the status bar item's appearance
     */
    public updateStatusBarItem(): void {
        if (!this.statusBarItem) {
            return;
        }

        if (this.isLicensed) {
            this.statusBarItem.text = "$(verified) Premium";
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        } else if (this.isTrialValid()) {
            const days = this.getRemainingTrialDays();
            this.statusBarItem.text = `$(clock) Trial (${days}d)`;
            this.statusBarItem.backgroundColor = undefined;
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
     * Checks if the trial period is still valid
     */
    private isTrialValid(): boolean {
        if (!this.trialStartDate) return false;
        const trialEnd = new Date(this.trialStartDate);
        trialEnd.setDate(trialEnd.getDate() + this.TRIAL_PERIOD_DAYS);
        return new Date() < trialEnd;
    }

    /**
     * Starts the trial period
     */
    async startTrial(): Promise<void> {
        if (!this.trialStartDate) {
            this.trialStartDate = new Date();
            await this.context.globalState.update('trialStartDate', this.trialStartDate.toISOString());
        }
    }

    /**
     * Gets the remaining days in the trial period
     * @returns Number of days remaining
     */
    getRemainingTrialDays(): number {
        if (!this.trialStartDate) return 0;
        const trialEnd = new Date(this.trialStartDate);
        trialEnd.setDate(trialEnd.getDate() + this.TRIAL_PERIOD_DAYS);
        const remaining = Math.ceil((trialEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, remaining);
    }

    /**
     * Checks if premium features are available
     * @returns Whether premium features can be accessed
     */
    isFeatureAvailable(): boolean {
        return this.isLicensed || this.isTrialValid();
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
     * Starts periodic license validation
     */
    startPeriodicValidation(): void {
        setInterval(async () => {
            if (this.isLicensed) {
                await this.validateLicense();
            }
        }, 24 * 60 * 60 * 1000); // Check every 24 hours
    }

    /**
     * Handles Axios errors in a consistent way
     * @param error The error to handle
     * @returns Formatted error response
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
            trialStartDate: this.trialStartDate?.toISOString() || null,
            licenseKey: this.context.globalState.get('licenseKey') || null,
            instanceId: this.context.globalState.get('instanceId') || null
        };
    }
}
