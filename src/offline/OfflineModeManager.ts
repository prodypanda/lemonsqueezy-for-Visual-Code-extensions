import * as vscode from 'vscode';
import { OfflineMode, LicenseState, LicenseConfig } from '../types';

export class OfflineModeManager {
    private static instance: OfflineModeManager;
    private offlineMode: OfflineMode;
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.offlineMode = this.loadOfflineState();
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
                config: {} as LicenseConfig
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
            return false;
        }

        const lastCheck = new Date(this.offlineMode.lastOnlineCheck);
        const now = new Date();
        const hoursSinceLastCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60);

        return hoursSinceLastCheck < config.offlineMode.cacheDuration;
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
}
