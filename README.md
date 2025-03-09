# VS Code Extension Freemium Blueprint with LemonSqueezy

A production-ready template for creating VS Code extensions with freemium features using LemonSqueezy for license management.

## 🎯 What This Blueprint Does

- Provides a complete freemium extension structure
- Handles all LemonSqueezy license API integration
- Manages free vs premium feature gating
- Includes working example features

## 🚀 How to Use This Blueprint

1. Clone this repository
2. Set your LemonSqueezy credentials:
```typescript
private readonly STORE_ID = YOUR_STORE_ID;    // From LemonSqueezy dashboard
private readonly PRODUCT_ID = YOUR_PRODUCT_ID; // From your product settings
```
3. Replace example features with your own:
```typescript
// Free feature
export function myFreeFeature() {
    // Everyone can use this
}

// Premium feature
if (licenseManager.isFeatureAvailable()) {
    // Only paid users can use this
}
```

## 💳 LemonSqueezy Integration

Already implemented endpoints:
- `/v1/licenses/validate` - License validation
- `/v1/licenses/activate` - License activation
- `/v1/licenses/deactivate` - License deactivation

No additional setup needed - just add your credentials.

## 🏗️ Architecture

### License Management
- Built-in LemonSqueezy API integration
- Secure license validation system
- Status bar indicator for license state
- Persistent license storage

### Feature Gating Example
The blueprint includes example features to demonstrate the freemium model:

**Free Features:**
- Word count functionality
- Status bar integration

**Premium Features:**
- Base64 encoding/decoding
- Syntax highlighting
  - Custom bracket highlighting
  - Keyword highlighting

## 🚀 Getting Started

1. Clone this repository
2. Replace placeholder values:
```typescript
private readonly STORE_ID = YOUR_STORE_ID;
private readonly PRODUCT_ID = YOUR_PRODUCT_ID;
```
3. Add your own free/premium features

## 💳 LemonSqueezy Integration

### API Endpoints Used
- `/v1/licenses/validate` - Validates license keys
- `/v1/licenses/activate` - Activates licenses for specific instances
- `/v1/licenses/deactivate` - Deactivates license instances

### License States
- Free: Basic functionality
- Premium: Full access after license activation

### Security
- Server-side validation
- Instance-based licensing
- Regular validation checks

## 📝 Implementation Guide

1. **Add Free Features**
   ```typescript
   export function yourFreeFeature() {
     // Available to all users
   }
   ```

2. **Add Premium Features**
   ```typescript
   if (licenseManager.isFeatureAvailable()) {
     // Only available with valid license
   }
   ```

3. **Handle License States**
   ```typescript
   licenseManager.updateStatusBarItem();
   ```

See the example implementation in `src/` for complete working code.

## Features

### Free Features
- **Word Count**: Quickly get the word count of any document
- **Basic Status Bar**: Shows the current license status (Free/Trial/Premium)

### Premium Features
- **Base64 Encoding/Decoding**
  - Convert text to base64
  - Convert base64 back to text
  - Works with selected text
- **Smart Syntax Highlighting**
  - Bracket highlighting with custom colors
  - Keyword highlighting for important programming terms
  - Customizable highlighting colors

## Getting Started

1. Install the extension from the VS Code marketplace
2. Access free features immediately
3. Activate your premium license

### Activating Premium Features

1. **Activate License**
   - Purchase a license from [our store](https://yourstore.lemonsqueezy.com)
   - Use command: `Activate Premium License`
   - Enter your license key

## Commands

| Command | Description | Availability |
|---------|-------------|--------------|
| `Free Sample Feature` | Show document word count | Free |
| `Activate Premium License` | Activate your premium license | Free |
| `Deactivate Premium License` | Deactivate current license | Premium |
| `Premium Feature` | Highlight brackets | Premium |
| `Highlight Keywords` | Highlight programming keywords | Premium |
| `Encode to Base64` | Convert text to base64 | Premium |
| `Decode from Base64` | Convert base64 to text | Premium |

## Extension Settings

This extension contributes the following settings:

- `featureRich.highlightColors`: Customize syntax highlighting colors
  ```json
  {
    "brackets": "#FF9800",
    "keywords": "#2196F3"
  }
  ```

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
- Premium (activated)
