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
                    display: grid;
                    grid-template-columns: auto 1fr;
                    gap: 10px;
                    align-items: center;
                }
                .info-row {
                    display: contents;
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
                    width: 100%;
                    text-align: left;
                }
                .feature-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .feature-button.premium {
                    background-color: var(--vscode-statusBarItem-prominentBackground);
                }
                .feature-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .feature-button .icon {
                    font-family: codicon;
                    font-size: 14px;
                }
                .status-badge {
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .status-badge.free {
                    background: var(--vscode-inputValidation-infoBackground);
                    color: var(--vscode-inputValidation-infoForeground);
                }
                .status-badge.premium {
                    background: var(--vscode-inputValidation-warningBackground);
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
                }
                .message.error {
                    background: var(--vscode-inputValidation-errorBackground);
                    color: var(--vscode-inputValidation-errorForeground);
                }
                .message.success {
                    background: var(--vscode-inputValidation-infoBackground);
                    color: var(--vscode-inputValidation-infoForeground);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="section">
                    <div class="header">
                        <span class="icon">$(key)</span>
                        <h2>License Management</h2>
                    </div>
                    <div id="licenseSection">
                        <input type="text" id="licenseKey" class="license-input" 
                               placeholder="Enter your license key (XXXX-XXXX-XXXX-XXXX)" />
                        <div id="message" class="message" style="display: none;"></div>
                        <button id="activateBtn" class="feature-button">
                            <span class="icon">$(check)</span>
                            Activate License
                        </button>
                    </div>
                    <div id="subscriptionInfo" class="subscription-info" style="display: none;">
                        <div class="info-row">
                            <span class="info-label">Status:</span>
                            <span class="info-value" id="statusBadge"></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Active Since:</span>
                            <span class="info-value" id="activeSince"></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">License Key:</span>
                            <span class="info-value" id="licenseKeyDisplay"></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Valid Until:</span>
                            <span class="info-value" id="validUntil"></span>
                        </div>
                        <div style="grid-column: span 2; margin-top: 10px;">
                            <button id="deactivateBtn" class="feature-button">
                                <span class="icon">$(trash)</span>
                                Deactivate License
                            </button>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="header">
                        <span class="icon">$(tools)</span>
                        <h2>Features</h2>
                    </div>
                    <div id="features">
                        <button class="feature-button" onclick="runFeature('extension.freeSample')">
                            <span class="icon">$(text-size)</span>
                            Word Count
                            <span class="status-badge free">Free</span>
                        </button>
                        <button class="feature-button premium" onclick="runFeature('extension.premiumFeature')">
                            <span class="icon">$(bracket)</span>
                            Highlight Brackets
                            <span class="status-badge premium">Premium</span>
                        </button>
                        <button class="feature-button premium" onclick="runFeature('extension.premiumHighlightKeywords')">
                            <span class="icon">$(symbol-keyword)</span>
                            Highlight Keywords
                            <span class="status-badge premium">Premium</span>
                        </button>
                        <button class="feature-button premium" onclick="runFeature('extension.encodeBase64')">
                            <span class="icon">$(arrow-right)</span>
                            Encode Base64
                            <span class="status-badge premium">Premium</span>
                        </button>
                        <button class="feature-button premium" onclick="runFeature('extension.decodeBase64')">
                            <span class="icon">$(arrow-left)</span>
                            Decode Base64
                            <span class="status-badge premium">Premium</span>
                        </button>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const licenseInput = document.getElementById('licenseKey');
                const activateBtn = document.getElementById('activateBtn');
                const deactivateBtn = document.getElementById('deactivateBtn');
                const subscriptionInfo = document.getElementById('subscriptionInfo');

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

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'update-state':
                            const state = message.state;
                            if (state.isLicensed) {
                                licenseInput.value = state.licenseKey;
                                licenseInput.disabled = true;
                                activateBtn.style.display = 'none';
                                subscriptionInfo.style.display = 'grid';
                                
                                document.getElementById('statusBadge').innerHTML = 
                                    '<span class="status-badge premium">Premium Active</span>';
                                document.getElementById('activeSince').textContent = 
                                    new Date(state.lastValidated).toLocaleDateString();
                                document.getElementById('licenseKeyDisplay').textContent = 
                                    state.licenseKey;
                                document.getElementById('validUntil').textContent = 
                                    state.validUntil ? new Date(state.validUntil).toLocaleDateString() : 'Perpetual';

                                // Enable premium features
                                document.querySelectorAll('.feature-button.premium').forEach(btn => {
                                    btn.disabled = false;
                                });
                            } else {
                                licenseInput.value = '';
                                licenseInput.disabled = false;
                                activateBtn.style.display = 'block';
                                subscriptionInfo.style.display = 'none';

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
            </script>
        </body>
        </html>`;
    }
}

