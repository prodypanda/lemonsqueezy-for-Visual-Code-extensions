/**
 * BLUEPRINT: VS Code Extension with Free/Premium Features
 * 
 * This file shows examples of:
 * 1. How to create free features (freeSample)
 * 2. How to create premium features (premiumFeature)
 * 3. How to handle license activation/deactivation
 * 
 * Replace these examples with your own features
 */

// Import required VS Code functionality and our custom code
import * as vscode from 'vscode';
import { LicenseManager } from './licenseManager';
import { Base64Result } from './types';
import { SubscriptionPanel } from './panels/SubscriptionPanel';

// Example premium feature styling - Replace with your own premium feature styles
const PREMIUM_DECORATIONS = {
    // Bracket highlighting style (orange color)
    brackets: vscode.window.createTextEditorDecorationType({
        color: '#ff0000',
        fontWeight: 'bold'
    }),
    // Keyword highlighting style (blue color)
    keywords: vscode.window.createTextEditorDecorationType({
        color: '#ff00ee',
        fontWeight: 'bold'
    })
};

const COMMAND_TIMEOUT = 30000; // 30 seconds

function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), timeout)
        )
    ]);
}

/**
 * Example Premium Feature: Base64 Encoding
 * Replace or modify this with your own premium features
 * @param text Text to encode
 */
function encodeBase64(text: string): Base64Result {
    if (!text) {
        return {
            success: false,
            message: 'No text provided',
            result: '',
            error: 'Empty input'
        };
    }

    try {
        const encoded = Buffer.from(text).toString('base64');
        return {
            success: true,
            result: encoded,
            message: 'Text encoded successfully'
        };
    } catch (error) {
        console.error('Encoding error:', error);
        return {
            success: false,
            result: '',
            message: 'Failed to encode text',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Example Premium Feature: Base64 Decoding
 * Replace or modify this with your own premium features
 * @param base64 Base64 string to decode
 */
function decodeBase64(base64: string): Base64Result {
    try {
        const decoded = Buffer.from(base64, 'base64').toString('utf-8');
        return {
            success: true,
            result: decoded,
            message: 'Text decoded successfully'
        };
    } catch (error) {
        return {
            success: false,
            result: '',
            message: 'Invalid base64 string',
            error: 'Invalid base64 string'
        };
    }
}

// Enhanced error handling wrapper
function handleCommand(callback: () => Promise<void> | void): () => Promise<void> {
    return async () => {
        try {
            await callback();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Operation failed: ${errorMessage}`);
            console.error('Command error:', error);
        }
    };
}

// Enhanced command error handling
async function handleCommandWithRetry<T>(
    operation: () => Promise<T>,
    errorMessage: string
): Promise<T | undefined> {
    try {
        return await operation();
    } catch (error) {
        console.error(error);
        vscode.window.showErrorMessage(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return undefined;
    }
}

/**
 * Extension Activation
 * This is where you register your commands and initialize the license system
 * 
 * Steps:
 * 1. Start license checking system
 * 2. Set up all our commands
 * 3. Create status bar button
 * 4. Set up trial system
 */
export async function activate(context: vscode.ExtensionContext) {
    const licenseManager = LicenseManager.getInstance(context);

    // Immediate validation and data refresh on startup
    await licenseManager.refreshLicenseState();

    // Add validation on window focus
    context.subscriptions.push(
        vscode.window.onDidChangeWindowState(async (e) => {
            if (e.focused) {
                await licenseManager.refreshLicenseState();
            }
        })
    );

    // Register Subscription Panel
    const subscriptionProvider = new SubscriptionPanel(context.extensionUri, licenseManager);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SubscriptionPanel.viewType,
            subscriptionProvider
        )
    );

    // Initialize license state immediately
    await licenseManager.validateLicense();
    licenseManager.updateStatusBarItem();

    // Setup periodic validation
    const validationInterval = setInterval(async () => {
        await licenseManager.validateLicense();
    }, 24 * 60 * 60 * 1000); // Check every 24 hours

    // Register our commands with enhanced error handling
    const commands = [
        {
            id: 'extension.activateLicense',
            callback: async () => {
                try {
                    // Check if there's already an active license
                    const currentState = licenseManager.getLicenseState();
                    if (currentState.isLicensed) {
                        const choice = await vscode.window.showWarningMessage(
                            'A license is already active. Do you want to deactivate it first?',
                            'Yes, deactivate',
                            'No, keep current'
                        );

                        if (choice === 'Yes, deactivate') {
                            const deactivateResult = await licenseManager.deactivateLicense();
                            if (!deactivateResult.success) {
                                vscode.window.showErrorMessage('Failed to deactivate current license: ' + deactivateResult.message);
                                return;
                            }
                        } else {
                            return;
                        }
                    }

                    const licenseKey = await vscode.window.showInputBox({
                        prompt: 'Enter your license key from LemonSqueezy',
                        placeHolder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
                        validateInput: (value) => {
                            return /^[a-zA-Z0-9-]{36}$/.test(value)
                                ? null
                                : 'Invalid license key format. Must be in format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX';
                        }
                    });

                    if (!licenseKey) {
                        return; // User cancelled
                    }

                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Activating license...',
                        cancellable: false
                    }, async (progress) => {
                        try {
                            progress.report({ message: 'Validating license key...' });
                            const result = await licenseManager.activateLicense(licenseKey);

                            if (result.success) {
                                vscode.window.showInformationMessage(result.message);
                            } else {
                                vscode.window.showErrorMessage(result.message || 'License activation failed');
                            }
                        } catch (error) {
                            console.error('License activation error:', error);
                            vscode.window.showErrorMessage(
                                `License activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                            );
                        }
                    });
                } catch (error) {
                    console.error('Command error:', error);
                    vscode.window.showErrorMessage(
                        `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            }
        },
        {
            id: 'extension.deactivateLicense',
            callback: handleCommand(async () => {
                const result = await licenseManager.deactivateLicense();
                if (result.success) {
                    vscode.window.showInformationMessage(result.message);
                } else {
                    vscode.window.showErrorMessage(result.message);
                }
            })
        },
        // Example free feature
        {
            id: 'extension.freeSample',
            callback: handleCommand(() => {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const text = editor.document.getText();
                    const wordCount = text.split(/\s+/).length;
                    vscode.window.showInformationMessage(`Word count: ${wordCount} (Free Feature)`);
                }
            })
        },
        // Example premium feature
        {
            id: 'extension.premiumFeature',
            callback: handleCommand(() => {
                if (licenseManager.isFeatureAvailable()) {
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        const text = editor.document.getText();
                        const brackets = [];
                        const pattern = /[\(\)\[\]\{\}]/g;
                        let match;

                        while ((match = pattern.exec(text)) !== null) {
                            const startPos = editor.document.positionAt(match.index);
                            const endPos = editor.document.positionAt(match.index + 1);
                            brackets.push(new vscode.Range(startPos, endPos));
                        }

                        editor.setDecorations(PREMIUM_DECORATIONS.brackets, brackets);
                        vscode.window.showInformationMessage('Brackets highlighted! (Premium Feature)');
                    }
                } else {
                    vscode.window.showWarningMessage('Premium feature requires a license. Please activate your license.');
                }
            })
        },
        {
            id: 'extension.premiumHighlightKeywords',
            callback: handleCommand(() => {
                if (!licenseManager.isFeatureAvailable()) {
                    vscode.window.showWarningMessage('Premium feature requires a license. Please activate your license.');
                    return;
                }

                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const text = editor.document.getText();
                    const keywords = /\b(function|class|const|let|var|import|export)\b/g;
                    const matches = [];
                    let match;

                    while ((match = keywords.exec(text)) !== null) {
                        const startPos = editor.document.positionAt(match.index);
                        const endPos = editor.document.positionAt(match.index + match[0].length);
                        matches.push(new vscode.Range(startPos, endPos));
                    }

                    editor.setDecorations(PREMIUM_DECORATIONS.keywords, matches);
                    vscode.window.showInformationMessage('Keywords highlighted! (Premium Feature)');
                }
            })
        },
        {
            id: 'extension.encodeBase64',
            callback: handleCommand(() => {
                if (!licenseManager.isFeatureAvailable()) {
                    vscode.window.showWarningMessage('Premium feature requires a license. Please activate your license.');
                    return;
                }

                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const selection = editor.selection;
                    const text = editor.document.getText(selection);
                    if (!text) {
                        vscode.window.showWarningMessage('Please select text to encode');
                        return;
                    }

                    const result = encodeBase64(text);
                    if (result.success) {
                        editor.edit(editBuilder => {
                            editBuilder.replace(selection, result.result);
                        });
                    } else {
                        vscode.window.showErrorMessage(result.error || 'Encoding failed');
                    }
                }
            })
        },
        {
            id: 'extension.decodeBase64',
            callback: handleCommand(() => {
                if (!licenseManager.isFeatureAvailable()) {
                    vscode.window.showWarningMessage('Premium feature requires a license. Please activate your license.');
                    return;
                }

                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const selection = editor.selection;
                    const text = editor.document.getText(selection);
                    if (!text) {
                        vscode.window.showWarningMessage('Please select text to decode');
                        return;
                    }

                    const result = decodeBase64(text);
                    if (result.success) {
                        editor.edit(editBuilder => {
                            editBuilder.replace(selection, result.result);
                        });
                    } else {
                        vscode.window.showErrorMessage(result.error || 'Decoding failed');
                    }
                }
            })
        }
    ];

    // Update subscription panel when license state changes
    const updateSubscriptionPanel = () => {
        subscriptionProvider.updateView();
    };

    // Add panel update to existing license state changes
    licenseManager.onLicenseChange(updateSubscriptionPanel);

    // Cleanup on deactivation
    context.subscriptions.push({
        dispose: () => {
            clearInterval(validationInterval);
            licenseManager.dispose();
        }
    });

    // Register commands
    commands.forEach(({ id, callback }) => {
        context.subscriptions.push(
            vscode.commands.registerCommand(id, callback)
        );
    });
}

/**
 * Clean up function that runs when our extension is disabled
 * Makes sure we don't leave any mess behind
 */
export function deactivate() {
    // Remove any special text highlighting we added
    Object.values(PREMIUM_DECORATIONS).forEach(decoration => decoration.dispose());
}
