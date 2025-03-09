// Import required VS Code functionality and our custom code
import * as vscode from 'vscode';
import { LicenseManager } from './licenseManager';
import { Base64Result } from './types';

// Example premium feature styling - Replace with your own premium feature styles
const PREMIUM_DECORATIONS = {
    // Bracket highlighting style (orange color)
    brackets: vscode.window.createTextEditorDecorationType({
        color: '#FF9800',
        fontWeight: 'bold'
    }),
    // Keyword highlighting style (blue color)
    keywords: vscode.window.createTextEditorDecorationType({
        color: '#2196F3',
        fontWeight: 'bold'
    })
};

/**
 * Example Premium Feature: Base64 Encoding
 * Replace or modify this with your own premium features
 * @param text Text to encode
 */
function encodeBase64(text: string): Base64Result {
    try {
        const encoded = Buffer.from(text).toString('base64');
        return { success: true, result: encoded };
    } catch (error) {
        return { success: false, result: '', error: 'Failed to encode text' };
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
        return { success: true, result: decoded };
    } catch (error) {
        return { success: false, result: '', error: 'Invalid base64 string' };
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
    // Create our license manager (handles free/premium features)
    const licenseManager = LicenseManager.getInstance(context);

    // Make sure our status bar button shows up
    setTimeout(async () => {
        await licenseManager.validateLicense();
        licenseManager.updateStatusBarItem();
    }, 500);

    licenseManager.startPeriodicValidation();
    licenseManager.updateStatusBarItem();

    // Example command structure - Replace with your own commands
    const commands = [
        // Command to activate a license
        {
            id: 'extension.activateLicense',
            callback: async () => {
                // Show input box for license key
                const licenseKey = await vscode.window.showInputBox({
                    prompt: 'Enter your license key',
                    placeHolder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                });

                // If they entered a key, try to activate it
                if (licenseKey) {
                    const result = await licenseManager.activateLicense(licenseKey);
                    if (result.success) {
                        vscode.window.showInformationMessage(result.message);
                    } else {
                        vscode.window.showErrorMessage(result.message);
                    }
                }
            }
        },
        {
            id: 'extension.deactivateLicense',
            callback: async () => {
                const result = await licenseManager.deactivateLicense();
                if (result.success) {
                    vscode.window.showInformationMessage(result.message);
                } else {
                    vscode.window.showErrorMessage(result.message);
                }
            }
        },
        // Example free feature
        {
            id: 'extension.freeSample',
            callback: () => {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const text = editor.document.getText();
                    const wordCount = text.split(/\s+/).length;
                    vscode.window.showInformationMessage(`Word count: ${wordCount} (Free Feature)`);
                }
            }
        },
        // Example premium feature
        {
            id: 'extension.premiumFeature',
            callback: () => {
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
            }
        },
        {
            id: 'extension.premiumHighlightKeywords',
            callback: () => {
                if (!licenseManager.isFeatureAvailable()) {
                    vscode.window.showWarningMessage('Premium feature requires a license.');
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
            }
        },
        {
            id: 'extension.encodeBase64',
            callback: () => {
                if (!licenseManager.isFeatureAvailable()) {
                    vscode.window.showWarningMessage('Premium feature requires a license.');
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
            }
        },
        {
            id: 'extension.decodeBase64',
            callback: () => {
                if (!licenseManager.isFeatureAvailable()) {
                    vscode.window.showWarningMessage('Premium feature requires a license.');
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
            }
        }
    ];

    // Register all our commands with VS Code
    commands.forEach(command => {
        context.subscriptions.push(
            vscode.commands.registerCommand(command.id, command.callback)
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
