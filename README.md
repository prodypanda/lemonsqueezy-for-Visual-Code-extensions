# Feature Rich Extension

A VS Code extension offering both free and premium features for enhanced code analysis and visualization.

## Features

### Free Features
- Basic word count analysis
- Simple code metrics
- Trial period of 14 days for premium features

### Premium Features
- Advanced code metrics visualization
- Syntax highlighting for brackets and keywords
- Code complexity analysis
- Real-time code structure visualization

## Installation

1. Download the VSIX file from the releases page
2. Install in VS Code using:
   ```bash
   code --install-extension feature-rich-extension-1.0.0.vsix
   ```

## Usage

### Free Features
1. Basic Word Count:
   - Command Palette: `Free Sample Feature`
   - Shows word count of current file

### Starting Trial
1. Click the "Free" button in status bar or
2. Command Palette: `Start Free Trial`
3. Get 14 days access to premium features

### Premium Features
1. Activate License:
   - Click "Free" in status bar or
   - Command Palette: `Activate Premium License`
   - Enter your license key

2. Highlight Brackets:
   - Keyboard: `Ctrl+Shift+H` (`Cmd+Shift+H` on Mac)
   - Command Palette: `Premium Feature`

3. Highlight Keywords:
   - Keyboard: `Ctrl+Shift+K` (`Cmd+Shift+K` on Mac)
   - Command Palette: `Highlight Keywords (Premium)`

4. Code Metrics:
   - Command Palette: `Show Code Metrics (Premium)`
   - Shows lines, functions, classes, complexity

5. Metrics Visualization:
   - Command Palette: `Show Code Metrics Chart (Premium)`
   - Displays interactive charts

### Configuration
```json
{
    "featureRich.highlightColors": {
        "brackets": "#FF9800",
        "keywords": "#2196F3"
    },
    "featureRich.metrics.enabled": true
}
```

## License Management

1. Activate License:
   - Command: `Activate Premium License`
   - Enter your license key

2. Deactivate License:
   - Command: `Deactivate Premium License`
   - Removes license from current installation

3. Status Bar Indicator:
   - 🌟 Free: No license activated
   - ⏰ Trial: Shows remaining days
   - ✓ Premium: Full access

## Support

For support or license purchases, visit our website at [your-website-here]

## Requirements

- VS Code version 1.80.0 or higher
