import * as vscode from 'vscode';
import axios from 'axios';
import { OfflineMode, LicenseState, LicenseConfig, ConnectivityStatus } from '../types';

export class OfflineModeManager {
    private static instance: OfflineModeManager;
    private offlineMode: OfflineMode;
    private context: vscode.ExtensionContext;
    private connectivityCheckInterval: NodeJS.Timer | null = null;
    private isOnline: boolean = true;
    private readonly PING_ENDPOINT = 'https://api.lemonsqueezy.com/ping';
    private readonly PING_INTERVAL = 1 * 10 * 1000; // 30 seconds

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.offlineMode = this.loadOfflineState();
        this.startConnectivityCheck();
    }

    static getInstance(context: vscode.ExtensionContext): OfflineModeManager {
        if (!OfflineModeManager.instance) {
            OfflineModeManager.instance = new OfflineModeManager(context);
        }
        return OfflineModeManager.instance;
    }

    private loadOfflineState(): OfflineMode {
        const defaultState: OfflineMode = {
            enabled: false,
            lastOnlineCheck: new Date().toISOString(),
            cachedLicenseState: {
                success: true,
                message: 'Initial offline state',
                isLicensed: false,
                licenseKey: null,
                instanceId: null,
                retryCount: 0,
                config: {} as LicenseConfig,
                connectivityStatus: {
                    isOnline: true,
                    tooltipText: 'Online'
                }
            }
        };

        return this.context.globalState.get('offlineMode') || defaultState;
    }

    async updateOfflineState(state: Partial<OfflineMode>): Promise<void> {
        this.offlineMode = { ...this.offlineMode, ...state };
        await this.context.globalState.update('offlineMode', this.offlineMode);
    }

    async cacheValidLicenseState(licenseState: LicenseState): Promise<void> {
        await this.updateOfflineState({
            lastOnlineCheck: new Date().toISOString(),
            cachedLicenseState: licenseState
        });
    }

    isOfflineValid(config: LicenseConfig): boolean {
        if (!this.offlineMode.enabled || !this.offlineMode.cachedLicenseState.isLicensed) {
            console.log('Offline mode disabled or no cached license state');
            return false;
        }

        const lastCheck = new Date(this.offlineMode.lastOnlineCheck);
        const now = new Date();
        const minutesSinceLastCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60);

        const isValid = minutesSinceLastCheck < config.offlineMode.cacheDuration;
        console.log(`Offline validation: ${isValid ? 'valid' : 'invalid'}, Minutes since last check: ${minutesSinceLastCheck}`);
        return isValid;
    }

    getCachedLicenseState(): LicenseState | null {
        return this.offlineMode.cachedLicenseState || null;
    }

    async enableOfflineMode(): Promise<void> {
        await this.updateOfflineState({ enabled: true });
    }

    async disableOfflineMode(): Promise<void> {
        await this.updateOfflineState({ enabled: false });
    }

    isEnabled(): boolean {
        return this.offlineMode.enabled;
    }

    private async startConnectivityCheck(): Promise<void> {
        // Initial check
        await this.checkConnectivity();

        // Set up periodic checks
        this.connectivityCheckInterval = setInterval(async () => {
            await this.checkConnectivity();
        }, this.PING_INTERVAL);
    }

    private async checkConnectivity(): Promise<void> {
        try {
            const response = await axios.get(this.PING_ENDPOINT, {
                timeout: 5000 // 5 second timeout
            });
            this.isOnline = response.status === 200;
        } catch (error) {
            this.isOnline = false;
        }

        // Update last check time
        await this.updateOfflineState({
            lastOnlineCheck: new Date().toISOString()
        });
    }

    public isOfflineDurationExceeded(): boolean {
        if (!this.offlineMode.enabled || this.isOnline) {
            return false;
        }

        const lastCheck = new Date(this.offlineMode.lastOnlineCheck);
        const now = new Date();
        const minutesSinceLastCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60);
        return minutesSinceLastCheck >= this.context.workspaceState.get('offlineModeDuration', 1); // 72 hours in minutes
    }

    public getConnectivityStatus(): ConnectivityStatus {
        if (this.isOnline) {
            return {
                isOnline: true,
                tooltipText: 'Online'
            };
        }

        if (this.isOfflineDurationExceeded()) {
            return {
                isOnline: false,
                tooltipText: 'Offline - License validation required. Please reconnect to continue using premium features.'
            };
        }

        return {
            isOnline: false,
            tooltipText: `Offline - License valid for ${this.formatRemainingTime()}`
        };
    }

    private getRemainingOfflineMinutes(): number {
        const lastCheck = new Date(this.offlineMode.lastOnlineCheck);
        const now = new Date();
        const minutesSinceLastCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60); // milliseconds to minutes
        return Math.max(0, this.context.workspaceState.get('offlineModeDuration', 1) - minutesSinceLastCheck); // default to 72 hours (4320 minutes)
    }

    private formatRemainingTime(): string {
        if (!this.offlineMode.enabled) return 'unavailable';

        const minutes = this.getRemainingOfflineMinutes();
        if (minutes <= 0) return 'expired';

        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        const remainingMinutes = Math.floor(minutes % 60);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (remainingMinutes > 0 || parts.length === 0) parts.push(`${remainingMinutes}m`);

        return 'next ' + parts.join(' ');
    }

    dispose(): void {
        if (this.connectivityCheckInterval) {
            clearInterval(this.connectivityCheckInterval);
        }
    }
}
