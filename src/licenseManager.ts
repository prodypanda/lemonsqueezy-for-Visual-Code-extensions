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

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.updateStatusBarItem();
        this.statusBarItem.show();
        context.subscriptions.push(this.statusBarItem);

        const savedDate = this.context.globalState.get<string>('trialStartDate');
        this.trialStartDate = savedDate ? new Date(savedDate) : null;
    }

    static getInstance(context: vscode.ExtensionContext): LicenseManager {
        if (!LicenseManager.instance) {
            LicenseManager.instance = new LicenseManager(context);
        }
        return LicenseManager.instance;
    }

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

    private updateStatusBarItem(): void {
        if (this.isLicensed) {
            this.statusBarItem.text = "$(verified) Premium";
        } else if (this.isTrialValid()) {
            const days = this.getRemainingTrialDays();
            this.statusBarItem.text = `$(clock) Trial (${days}d)`;
        } else {
            this.statusBarItem.text = "$(star) Free";
        }
        this.statusBarItem.tooltip = this.isLicensed ? "Click to access premium features" : "Click to activate premium features";
        this.statusBarItem.command = this.isLicensed ? {
            title: 'Open Premium Features',
            command: 'workbench.action.quickOpen',
            arguments: ['>Premium:']
        } : 'extension.activateLicense';
        this.statusBarItem.backgroundColor = this.isLicensed ?
            new vscode.ThemeColor('statusBarItem.prominentBackground') :
            undefined;
    }

    private isTrialValid(): boolean {
        if (!this.trialStartDate) return false;
        const trialEnd = new Date(this.trialStartDate);
        trialEnd.setDate(trialEnd.getDate() + this.TRIAL_PERIOD_DAYS);
        return new Date() < trialEnd;
    }

    async startTrial(): Promise<void> {
        if (!this.trialStartDate) {
            this.trialStartDate = new Date();
            await this.context.globalState.update('trialStartDate', this.trialStartDate.toISOString());
        }
    }

    getRemainingTrialDays(): number {
        if (!this.trialStartDate) return 0;
        const trialEnd = new Date(this.trialStartDate);
        trialEnd.setDate(trialEnd.getDate() + this.TRIAL_PERIOD_DAYS);
        const remaining = Math.ceil((trialEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, remaining);
    }

    isFeatureAvailable(): boolean {
        return this.isLicensed || this.isTrialValid();
    }

    private async checkSubscriptionStatus(licenseKey: string): Promise<boolean> {
        try {
            const response = await axios.get(`https://api.lemonsqueezy.com/v1/licenses/${licenseKey}/status`);
            return response.data?.valid && !response.data?.expired;
        } catch {
            return false;
        }
    }

    startPeriodicValidation(): void {
        setInterval(async () => {
            if (this.isLicensed) {
                await this.validateLicense();
            }
        }, 24 * 60 * 60 * 1000); // Check every 24 hours
    }

    private async handleAxiosError(error: any): Promise<ValidationResponse> {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.error || error.message;
            return { success: false, message: `API Error: ${message}` };
        }
        return { success: false, message: 'An unexpected error occurred' };
    }

    getLicenseState(): LicenseState {
        return {
            isLicensed: this.isLicensed,
            trialStartDate: this.trialStartDate?.toISOString() || null,
            licenseKey: this.context.globalState.get('licenseKey') || null,
            instanceId: this.context.globalState.get('instanceId') || null
        };
    }
}
