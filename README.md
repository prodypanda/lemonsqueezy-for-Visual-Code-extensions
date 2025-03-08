# Feature Rich Extension

A powerful Visual Studio Code extension that offers both free and premium features with LemonSqueezy integration for license management.

## Features

### Free Features
- **Word Count**: Quickly get the word count of any document
- **Basic Status Bar**: Shows the current license status (Free/Trial/Premium)

### Premium Features
- **Smart Syntax Highlighting**
  - Bracket highlighting with custom colors
  - Keyword highlighting for important programming terms
  - Customizable highlighting colors

- **Code Metrics**
  - Line count
  - Character count
  - Function count
  - Class count
  - Code complexity analysis
  - Interactive metrics visualization with charts

## Getting Started

1. Install the extension from the VS Code marketplace
2. Access free features immediately
3. Start a 14-day trial or activate your premium license

### Activating Premium Features

You can activate premium features in two ways:

1. **Start Free Trial**
   - Command: `Start Free Trial`
   - Enjoy premium features for 14 days
   - Access through Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)

2. **Activate License**
   - Purchase a license from [our store](https://yourstore.lemonsqueezy.com)
   - Use command: `Activate Premium License`
   - Enter your license key

## Commands

| Command | Description | Availability |
|---------|-------------|--------------|
| `Free Sample Feature` | Show document word count | Free |
| `Start Free Trial` | Begin 14-day trial period | Free |
| `Activate Premium License` | Activate your premium license | Free |
| `Deactivate Premium License` | Deactivate current license | Premium |
| `Premium Feature` | Highlight brackets | Premium |
| `Highlight Keywords` | Highlight programming keywords | Premium |
| `Show Code Metrics` | Display code analysis | Premium |
| `Show Code Metrics Chart` | Show interactive metrics visualization | Premium |

## Extension Settings

This extension contributes the following settings:

- `featureRich.highlightColors`: Customize syntax highlighting colors
  ```json
  {
    "brackets": "#FF9800",
    "keywords": "#2196F3"
  }
  ```
- `featureRich.metrics.enabled`: Enable/disable code metrics analysis

## Keyboard Shortcuts

- Highlight Brackets: `Ctrl+Shift+H` (`Cmd+Shift+H` on macOS)
- Highlight Keywords: `Ctrl+Shift+K` (`Cmd+Shift+K` on macOS)

## Requirements

- Visual Studio Code version 1.80.0 or higher
- Active internet connection for license validation

## Premium License Benefits

- Unlimited access to all premium features
- Priority support
- Regular feature updates
- Support ongoing development

## Privacy and Data Collection

This extension collects anonymous usage data to improve the user experience. Data collected includes:
- Feature usage statistics
- Error reports
- License validation attempts

No personal information is collected. You can opt-out through VS Code's telemetry settings.

## Known Issues

See our [GitHub issues page](https://github.com/yourusername/feature-rich-extension/issues) for current issues and feature requests.

## Release Notes

### 1.0.0
- Initial release
- Basic and premium features implementation
- LemonSqueezy integration
- Trial system implementation

## Contributing

We welcome contributions! Please check our [contribution guidelines](CONTRIBUTING.md) before submitting pull requests.

## License

This extension is licensed under the [MIT License](LICENSE.md).

## Support

- [Documentation](https://github.com/yourusername/feature-rich-extension/wiki)
- [Report Issues](https://github.com/yourusername/feature-rich-extension/issues)
- [Premium Support](mailto:support@yourcompany.com)

---

**Enjoy using Feature Rich Extension!** 🚀

# LemonSqueezy Integration for VS Code Extensions

A complete example of how to integrate LemonSqueezy payment and licensing system into a Visual Studio Code extension.

## 🔑 License Management Features

### License Key Validation
- Validates license keys against LemonSqueezy API
- Checks store ID and product ID matching
- Verifies subscription status

### License Activation
- Activates licenses with unique instance IDs
- Stores license data securely
- Handles activation errors gracefully

### License Deactivation
- Deactivates licenses on request
- Removes stored license data
- Handles API errors properly

### Trial Management
- 14-day trial period
- Automatic trial expiration
- Trial status display in status bar

## 💻 Implementation Details

### LemonSqueezy API Integration
```typescript
const ENDPOINTS = {
    validate: 'https://api.lemonsqueezy.com/v1/licenses/validate',
    activate: 'https://api.lemonsqueezy.com/v1/licenses/activate',
    deactivate: 'https://api.lemonsqueezy.com/v1/licenses/deactivate'
}
```

### Key API Operations

1. **License Validation**
   - Validates license key authenticity
   - Checks store and product matching
   - Verifies subscription status

2. **License Activation**
   - Creates unique instance ID
   - Activates license with LemonSqueezy
   - Stores activation data

3. **License Deactivation**
   - Deactivates instance
   - Removes local license data
   - Updates UI state

## 🚀 Getting Started with LemonSqueezy Integration

1. Replace placeholder values:
   ```typescript
   private readonly STORE_ID = 157343; // Your store ID
   private readonly PRODUCT_ID = 463516; // Your product ID
   ```

2. Set up API endpoints in your extension:
   ```typescript
   axios.post('https://api.lemonsqueezy.com/v1/licenses/validate')
   axios.post('https://api.lemonsqueezy.com/v1/licenses/activate')
   axios.post('https://api.lemonsqueezy.com/v1/licenses/deactivate')
   ```

3. Implement license checks:
   ```typescript
   if (licenseManager.isFeatureAvailable()) {
       // Premium feature code
   }
   ```

## 📝 License State Management

The extension manages license states:
- Free
- Trial (14 days)
- Premium (activated)
