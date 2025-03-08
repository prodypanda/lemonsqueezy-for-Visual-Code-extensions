import * as vscode from 'vscode';
import { LicenseManager } from './licenseManager';
import TelemetryReporter from '@vscode/extension-telemetry';
import { CodeMetrics, TelemetryEvent } from './types';

const TELEMETRY_KEY = 'your-key-here';
let reporter: TelemetryReporter;

const PREMIUM_DECORATIONS = {
    brackets: vscode.window.createTextEditorDecorationType({
        color: '#FF9800',
        fontWeight: 'bold'
    }),
    keywords: vscode.window.createTextEditorDecorationType({
        color: '#2196F3',
        fontWeight: 'bold'
    })
};

const sendTelemetry = (event: TelemetryEvent) => {
    if (reporter) {
        // Convert all properties to strings to match VSCode's requirements
        const properties = event.properties ?
            Object.fromEntries(
                Object.entries(event.properties).map(([k, v]) => [k, String(v)])
            ) : undefined;

        reporter.sendTelemetryEvent(event.name, properties);
    }
};

function calculateMetrics(text: string): CodeMetrics {
    const lines = text.split('\n');
    const chars = text.length;
    const words = text.split(/\s+/).length;
    const functions = (text.match(/function\s+\w+/g) || []).length;
    const classes = (text.match(/class\s+\w+/g) || []).length;
    const complexity = calculateComplexity(text);

    return {
        lines: lines.length,
        chars,
        words,
        functions,
        classes,
        complexity
    };
}

function calculateComplexity(text: string): number {
    const conditionals = (text.match(/if|while|for|switch/g) || []).length;
    const returns = (text.match(/return/g) || []).length;
    return conditionals + returns;
}

function generateMetricsChart(metrics: { lines: number, chars: number, words: number, functions: number, classes: number, complexity: number }) {
    return `
        <html>
        <head>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
            <canvas id="metricsChart" width="400" height="400"></canvas>
            <script>
                const ctx = document.getElementById('metricsChart').getContext('2d');
                const chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Lines', 'Characters', 'Words', 'Functions', 'Classes', 'Complexity'],
                        datasets: [{
                            label: 'Code Metrics',
                            data: [${metrics.lines}, ${metrics.chars}, ${metrics.words}, ${metrics.functions}, ${metrics.classes}, ${metrics.complexity}],
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            </script>
        </body>
        </html>
    `;
}

export function activate(context: vscode.ExtensionContext) {
    reporter = new TelemetryReporter(TELEMETRY_KEY);
    context.subscriptions.push(reporter);

    const licenseManager = LicenseManager.getInstance(context);

    // Validate existing license on startup
    licenseManager.validateLicense();

    const commands = [
        {
            id: 'extension.activateLicense',
            callback: async () => {
                const licenseKey = await vscode.window.showInputBox({
                    prompt: 'Enter your license key',
                    placeHolder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                });

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
            id: 'extension.showMetrics',
            callback: () => {
                if (!licenseManager.isFeatureAvailable()) {
                    vscode.window.showWarningMessage('Premium feature requires a license.');
                    return;
                }

                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const metrics = calculateMetrics(editor.document.getText());
                    vscode.window.showInformationMessage(
                        `Code Metrics (Premium):\n` +
                        `Lines: ${metrics.lines}\n` +
                        `Characters: ${metrics.chars}\n` +
                        `Words: ${metrics.words}\n` +
                        `Functions: ${metrics.functions}\n` +
                        `Classes: ${metrics.classes}\n` +
                        `Complexity: ${metrics.complexity}`
                    );
                }
            }
        }
    ];

    // Register all commands
    commands.forEach(command => {
        context.subscriptions.push(
            vscode.commands.registerCommand(command.id, command.callback)
        );
    });

    // Add trial command
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.startTrial', async () => {
            await licenseManager.startTrial();
            const days = licenseManager.getRemainingTrialDays();
            vscode.window.showInformationMessage(`Trial started! ${days} days remaining`);
            reporter.sendTelemetryEvent('trialStarted');
        })
    );

    // Enhance metrics visualization
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.showMetricsChart', () => {
            if (!licenseManager.isFeatureAvailable()) {
                vscode.window.showWarningMessage('Premium feature requires a license or active trial.');
                return;
            }

            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const metrics = calculateMetrics(editor.document.getText());
                const panel = vscode.window.createWebviewPanel(
                    'metricsChart',
                    'Code Metrics Chart',
                    vscode.ViewColumn.One,
                    { enableScripts: true }
                );

                panel.webview.html = generateMetricsChart(metrics);
                sendTelemetry({
                    name: 'metricsViewed',
                    properties: {
                        lines: String(metrics.lines),
                        complexity: String(metrics.complexity)
                    }
                });
            }
        })
    );
}

export function deactivate() {
    // Clean up decorations
    Object.values(PREMIUM_DECORATIONS).forEach(decoration => decoration.dispose());
}
