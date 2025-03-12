import * as vscode from 'vscode';
import { LicenseManager } from '../licenseManager';

export class SubscriptionPanel implements vscode.WebviewViewProvider {
    public static readonly viewType = 'featureRichSubscription';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _licenseManager: LicenseManager
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview();

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'activate-license':
                    if (data.value) {
                        const result = await this._licenseManager.activateLicense(data.value);
                        this._view?.webview.postMessage({
                            type: 'activation-result',
                            success: result.success,
                            message: result.message
                        });
                        if (result.success) {
                            this.updateView();
                        }
                    }
                    break;
                case 'deactivate-license':
                    const result = await this._licenseManager.deactivateLicense();
                    this._view?.webview.postMessage({
                        type: 'deactivation-result',
                        success: result.success,
                        message: result.message
                    });
                    if (result.success) {
                        this.updateView();
                    }
                    break;
                case 'run-feature':
                    vscode.commands.executeCommand(data.feature);
                    break;
            }
        });

        // Initial state update
        this.updateView();
    }

    public updateView() {
        if (this._view) {
            const state = this._licenseManager.getLicenseState();
            this._view.webview.postMessage({
                type: 'update-state',
                state: state
            });
        }
    }

    private _getHtmlForWebview() {
        return `<!DOCTYPE html>
        <html>
        <head>
        <link href="
https://cdn.jsdelivr.net/npm/vscode-codicons@0.0.17/dist/codicon.min.css
" rel="stylesheet">
            <style>
                body { 
                    padding: 15px;
                    font-family: var(--vscode-font-family);
                }
                .container { 
                    display: flex; 
                    flex-direction: column; 
                    gap: 15px;
                }
                .section {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 5px;
                    padding: 15px;
                    margin-bottom: 10px;
                }
                .header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 15px;
                }
                .header h2 {
                    margin: 0;
                    color: var(--vscode-foreground);
                }
                .license-input { 
                    width: 100%; 
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 3px;
                }
                .license-input:disabled {
                    opacity: 0.7;
                    background: var(--vscode-input-background);
                }
                .subscription-info {
                    display:inline-block;
                    /*display: grid;
                    grid-template-columns: auto 1fr;
                    gap: 10px;*/
                    align-items: center;
                    animation: fadeIn 0.3s ease-out;
                }
                .info-row {
                    display: flow;
                }
                .info-label {
                    color: var(--vscode-descriptionForeground);
                    font-size: 12px;
                }
                .info-value {
                    color: var(--vscode-foreground);
                    font-size: 12px;
                }
                .feature-button {
                    padding: 8px 12px;
                    cursor: pointer;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 3px;
                    margin-bottom: 5px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: calc(100% - 24px); /* Adjust width to account for padding */
                    text-align: left;
                    transition: all 0.2s ease;
                    justify-content: space-between; /* This will space out the elements */
                }
                .feature-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .feature-button:active {
                    transform: scale(0.98);
                }
                .feature-button.premium {
                    background-color: var(--vscode-statusBarItem-prominentBackground);
                }
                .feature-button.premium:not(:disabled):hover {
                    transform: translateY(-2px);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                .feature-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .feature-button .icon {
                    font-family: codicon;
                    font-size: 14px;
                }
                .feature-button .status-badge {
                    margin-left: auto; /* Push badge to the right */
                }
                .status-badge {
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 12px;
                    font-weight: 500;
                    animation: scaleIn 0.3s ease-out;
                }
                .status-badge.free {
                    background: var(--vscode-inputValidation-infoBackground);
                    color: var(--vscode-inputValidation-infoForeground);
                }
                .status-badge.premium {
                    background: #0b601a;
                   /* background: var(--vscode-inputValidation-warningBackground);*/
                    color: var(--vscode-inputValidation-warningForeground);
                }
                .divider {
                    height: 1px;
                    background: var(--vscode-widget-border);
                    margin: 15px 0;
                }
                .message {
                    padding: 8px;
                    border-radius: 3px;
                    font-size: 12px;
                    margin-top: 10px;
                    animation: fadeIn 0.3s ease-out;
                }
                .message.error {
                    background: var(--vscode-inputValidation-errorBackground);
                    color: var(--vscode-inputValidation-errorForeground);
                    animation: shake 0.4s ease-out;
                }
                .message.success {
                    background: var(--vscode-inputValidation-infoBackground);
                    color: var(--vscode-inputValidation-infoForeground);
                }
                .feature-group {
                    margin-bottom: 20px;
                }

                .feature-group-title {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .license-stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin: 15px 0;
                    animation: fadeIn 0.4s ease-out;
                }

                .stat-item {
                    background: var(--vscode-editor-background);
                    padding: 10px;
                    border-radius: 4px;
                    text-align: center;
                    transition: all 0.3s ease;
                }

                .stat-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .stat-value {
                    font-size: 20px;
                    font-weight: 500;
                    color: var(--vscode-foreground);
                }

                .stat-label {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }

                .copy-button {
                    padding: 4px 12px;
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 11px;
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                    opacity: 0.9;
                    font-weight: 500;
                }

                .copy-button:hover {
                    opacity: 1;
                    background: var(--vscode-button-secondaryHoverBackground);
                    transform: translateY(-1px);
                }

                .copy-button:active {
                    transform: scale(0.95);
                }

                .copy-button::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateX(-100%);
                }

                .copy-button.copied::after {
                    animation: ripple 0.6s ease-out;
                }

                .loading {
                    position: relative;
                    opacity: 0.7;
                    pointer-events: none;
                }

                .loading::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                }

                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }

                .loading-text {
                    animation: pulse 1.5s infinite;
                }

                .health-indicator {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 15px;
                    padding: 8px;
                    border-radius: 4px;
                    background: var(--vscode-editor-background);
                }

                .health-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--vscode-charts-green);
                }

                .health-dot.warning {
                    background: var(--vscode-charts-yellow);
                }

                .health-dot.error {
                    background: var(--vscode-charts-red);
                }

                .quick-actions {
                    display: flex;
                    gap: 8px;
                    margin: 15px 0;
                }

                .quick-action-btn {
                    padding: 4px 8px;
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 11px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .quick-action-btn:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }

                .usage-chart {
                    height: 40px;
                    background: var(--vscode-input-background);
                    border-radius: 3px;
                    overflow: hidden;
                    margin: 10px 0;
                }

                .usage-bar {
                    height: 100%;
                    background: var(--vscode-progressBar-background);
                    transition: width 0.3s ease;
                }

                @keyframes shimmer {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }

                .syncing {
                    animation: shimmer 2s infinite;
                }

                .tooltip {
                    position: relative;
                    display: inline-block;
                }

                .tooltip:hover::after {
                    content: attr(data-tooltip);
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 4px 8px;
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 3px;
                    font-size: 11px;
                    white-space: nowrap;
                    z-index: 1000;
                }

                /* Add styles for subscription tiers */
                .pricing-tier {
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                    border-left: 3px solid var(--vscode-textLink-foreground);
                }

                .tier-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .tier-name {
                    font-size: 14px;
                    font-weight: 600;
                }

                .tier-price {
                    font-size: 12px;
                    opacity: 0.8;
                }

                .feature-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .feature-list li {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                    font-size: 12px;
                }

                .feature-list .icon {
                    color: var(--vscode-gitDecoration-addedResourceForeground);
                }

                /* Enhanced usage bars */
                .usage-metric {
                    margin: 15px 0;
                }

                .usage-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                }

                .usage-label {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                }

                .usage-value {
                    font-size: 11px;
                    font-weight: 500;
                }

                .usage-bar-bg {
                    height: 4px;
                    background: var(--vscode-input-background);
                    border-radius: 2px;
                    overflow: hidden;
                }

                .usage-bar-fill {
                    height: 100%;
                    background: var(--vscode-progressBar-background);
                    transition: width 0.3s ease;
                }

                .usage-bar-fill.warning {
                    background: var(--vscode-notificationsWarningIcon-foreground);
                }

                .usage-bar-fill.error {
                    background: var(--vscode-notificationsErrorIcon-foreground);
                }

                /* Enhanced notifications */
                .notification {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    margin: 10px 0;
                    border-radius: 4px;
                    font-size: 12px;
                    animation: slideIn 0.3s ease;
                }

                .notification.warning {
                    background: var(--vscode-inputValidation-warningBackground);
                    color: var(--vscode-inputValidation-warningForeground);
                }

                .notification.error {
                    background: var(--vscode-inputValidation-errorBackground);
                    color: var(--vscode-inputValidation-errorForeground);
                }

                @keyframes slideIn {
                    from { transform: translateY(-10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                /* Enhanced buttons */
                .button-row {
                    display: flex;
                    gap: 8px;
                    margin: 15px 0;
                }

                .button-row button {
                    flex: 1;
                }

                .icon-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px;
                    border: none;
                    border-radius: 3px;
                    font-size: 11px;
                    cursor: pointer;
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }

                .icon-button:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }

                /* Enhanced animations */
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                @keyframes successPop {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }

                /* Loading animation */
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .loading-spinner {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: #fff;
                    animation: rotate 0.8s linear infinite;
                    margin-right: 8px;
                }

                /* Success animation */
                @keyframes checkmark {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }

                .success-icon {
                    animation: checkmark 0.5s ease-out;
                }

                @keyframes ripple {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="section">
                    <div class="header">
                        <span class="icon codicon codicon-key"></span>
                        <h2>License Management</h2>
                        <div class="info-row">
                            <span class="info-label">Status:</span>
                            <span class="info-value" id="statusBadge"></span>
                        </div>
                    </div>
                    <div id="licenseSection">
                        <input type="text" id="licenseKey" class="license-input" 
                               placeholder="Enter your license key (XXXX-XXXX-XXXX-XXXX)" />
                        <div id="message" class="message" style="display: none;"></div>
                        <button id="activateBtn" class="feature-button">
                            <span class="icon codicon codicon-check"></span>
                            Activate License
                        </button>
                    </div>
                    <div id="subscriptionInfo" class="subscription-info" style="display: none;">
                        <div class="info-row">
                            <span class="info-label">Active Since:</span>
                            <span class="info-value" id="activeSince"></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">License Key:</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="info-value" id="licenseKeyDisplay"></span>
                                <button class="copy-button" onclick="copyLicenseKey()">Copy</button>
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Valid Until:</span>
                            <span class="info-value" id="validUntil"></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Instance ID:</span>
                            <span class="info-value" id="instanceId"></span>
                        </div>

                        <div class="license-stats">
                            <div class="stat-item">
                                <div class="stat-value" id="daysRemaining">--</div>
                                <div class="stat-label">Days Remaining</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="activationCount">--</div>
                                <div class="stat-label">Activations Used</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="maxActivations">--</div>
                                <div class="stat-label">Max Activations</div>
                            </div>
                        </div>

                        <div style="grid-column: span 2; margin-top: 10px;">
                            <button id="deactivateBtn" class="feature-button">
                                <span class="icon codicon codicon-trash"></span>
                                Deactivate License
                            </button>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="header">
                        <span class="icon codicon codicon-tools"></span>
                        <h2>Features</h2>
                    </div>
                    <div id="features">
                        <div class="feature-group">
                            <div class="feature-group-title">Free Features</div>
                            <button class="feature-button" onclick="runFeature('extension.freeSample')">
                                <span class="icon codicon codicon-text-size"></span>
                                Word Count
                                <span class="status-badge free">Free</span>
                            </button>
                        </div>

                        <div class="feature-group">
                            <div class="feature-group-title">Premium Features</div>
                            <button class="feature-button premium" onclick="runFeature('extension.premiumFeature')">
                                <span class="icon codicon codicon-bracket-dot"></span>
                                Highlight Brackets
                                <span class="status-badge premium">Premium</span>
                            </button>
                            <button class="feature-button premium" onclick="runFeature('extension.premiumHighlightKeywords')">
                                <span class="icon codicon codicon-symbol-keyword"></span>
                                Highlight Keywords
                                <span class="status-badge premium">Premium</span>
                            </button>
                            <button class="feature-button premium" onclick="runFeature('extension.encodeBase64')">
                                <span class="icon codicon codicon-arrow-right"></span>
                                Encode Base64
                                <span class="status-badge premium">Premium</span>
                            </button>
                            <button class="feature-button premium" onclick="runFeature('extension.decodeBase64')">
                                <span class="icon codicon codicon-arrow-left"></span>
                                Decode Base64
                                <span class="status-badge premium">Premium</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const licenseInput = document.getElementById('licenseKey');
                const activateBtn = document.getElementById('activateBtn');
                const deactivateBtn = document.getElementById('deactivateBtn');
                const subscriptionInfo = document.getElementById('subscriptionInfo');
                const licenseSection = document.getElementById('licenseSection');

                activateBtn.addEventListener('click', () => {
                    vscode.postMessage({ 
                        type: 'activate-license', 
                        value: licenseInput.value 
                    });
                });

                deactivateBtn.addEventListener('click', () => {
                    vscode.postMessage({ type: 'deactivate-license' });
                });

                function runFeature(feature) {
                    vscode.postMessage({ type: 'run-feature', feature });
                }

                function copyLicenseKey() {
                    const licenseKey = document.getElementById('licenseKeyDisplay').textContent;
                    const copyButton = event.target;
                    
                    copyButton.classList.add('copied');
                    navigator.clipboard.writeText(licenseKey)
                        .then(() => {
                            copyButton.textContent = '✓ Copied!';
                            copyButton.classList.add('success-icon');
                            setTimeout(() => {
                                copyButton.textContent = 'Copy';
                                copyButton.classList.remove('success-icon', 'copied');
                            }, 2000);
                        })
                        .catch(() => {
                            copyButton.textContent = '✕ Failed!';
                            copyButton.classList.add('error');
                            setTimeout(() => {
                                copyButton.textContent = 'Copy';
                                copyButton.classList.remove('error', 'copied');
                            }, 2000);
                        });
                }

                function calculateDaysRemaining(validUntil) {
                    if (!validUntil) return 'Perpetual';
                    const now = new Date();
                    const expiryDate = new Date(validUntil);
                    const days = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                    return days > 0 ? days.toString() : '0';
                }

                function updateUsageData(data) {
                    if (!data?.license_key) return;
                    const { activation_limit, activation_usage } = data.license_key;
                    
                    document.getElementById('activationCount').textContent = activation_usage || '0';
                    document.getElementById('maxActivations').textContent = activation_limit || '∞';
                    document.getElementById('instanceId').textContent = data.instance?.id || 'N/A';
                    
                    // Update days remaining
                    if (data.license_key.expires_at) {
                        const daysLeft = calculateDaysRemaining(data.license_key.expires_at);
                        document.getElementById('daysRemaining').textContent = daysLeft;
                    } else {
                        document.getElementById('daysRemaining').textContent = '∞';
                    }
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'update-state':
                            const state = message.state;
                            if (state.isLicensed) {
                                licenseInput.value = state.licenseKey;
                                licenseInput.disabled = true;
                                activateBtn.style.display = 'none';
                                subscriptionInfo.style.display = 'inline-block';
                                licenseSection.style.display = 'none';
                                
                                document.getElementById('statusBadge').innerHTML = 
                                    '<span class="status-badge premium">Premium Active</span>';
                                document.getElementById('activeSince').textContent = 
                                    new Date(state.lastValidated).toLocaleDateString();
                                document.getElementById('licenseKeyDisplay').textContent = 
                                    state.licenseKey;
                                document.getElementById('validUntil').textContent = 
                                    state.validUntil ? new Date(state.validUntil).toLocaleDateString() : 'Perpetual';
                                document.getElementById('instanceId').textContent = 
                                    state.instanceId || 'Not available';

                                // Single source of truth for license stats
                                if (state.data?.license_key) {
                                    const licenseData = state.data.license_key;
                                    document.getElementById('activationCount').textContent = 
                                        String(licenseData.activation_usage);
                                    document.getElementById('maxActivations').textContent = 
                                        String(licenseData.activation_limit);
                                    document.getElementById('daysRemaining').textContent = 
                                        licenseData.expires_at ? calculateDaysRemaining(licenseData.expires_at) : 'Perpetual';
                                }

                                // Update license stats from API data
                                if (state.data) {
                                    console.log('License data:', state.data); // For debugging
                                    const licenseKey = state.data.license_key;
                                    if (licenseKey) {
                                        document.getElementById('activationCount').textContent = 
                                            String(licenseKey.activation_usage || '0');
                                        document.getElementById('maxActivations').textContent = 
                                            String(licenseKey.activation_limit || '∞');
                                        document.getElementById('daysRemaining').textContent = 
                                            licenseKey.expires_at ? calculateDaysRemaining(licenseKey.expires_at) : 'Perpetual';
                                    }
                                }

                                document.querySelectorAll('.feature-button.premium').forEach(btn => {
                                    btn.disabled = false;
                                });
                            } else {
                                licenseInput.value = '';
                                licenseInput.disabled = false;
                                activateBtn.style.display = 'block';
                                subscriptionInfo.style.display = 'none';
                                licenseSection.style.display = 'block';

                                // Disable premium features
                                document.querySelectorAll('.feature-button.premium').forEach(btn => {
                                    btn.disabled = true;
                                });
                            }
                            break;
                            
                        case 'activation-result':
                        case 'deactivation-result':
                            const messageDiv = document.getElementById('message');
                            messageDiv.textContent = message.message;
                            messageDiv.className = \`message \${message.success ? 'success' : 'error'}\`;
                            messageDiv.style.display = 'block';
                            setTimeout(() => {
                                messageDiv.style.display = 'none';
                            }, 5000);
                            break;
                    }
                });

                // Add loading state handlers
                function setLoading(isLoading) {
                    const buttons = document.querySelectorAll('.feature-button');
                    buttons.forEach(btn => {
                        if (isLoading) {
                            const spinner = document.createElement('span');
                            spinner.className = 'loading-spinner';
                            btn.prepend(spinner);
                            btn.classList.add('loading');
                        } else {
                            const spinner = btn.querySelector('.loading-spinner');
                            if (spinner) btn.removeChild(spinner);
                            btn.classList.remove('loading');
                        }
                    });
                }
            </script>
        </body>
        </html>`;
    }
}

