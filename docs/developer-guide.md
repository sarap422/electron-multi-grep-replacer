# Multi Grep Replacer Developer Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [Build and Deployment](#build-and-deployment)
6. [Testing](#testing)
7. [Debugging](#debugging)
8. [Extension Development](#extension-development)
9. [Contributing Guidelines](#contributing-guidelines)

## Architecture Overview

Multi Grep Replacer is built using Electron, providing a cross-platform desktop application with modern web technologies.

### Technology Stack

- **Framework**: Electron 25.0.0
- **Runtime**: Node.js 18.15.0
- **UI**: HTML5 + CSS3 + Vanilla JavaScript
- **Build System**: Electron Builder
- **Testing**: Jest + Spectron
- **Linting**: ESLint + Prettier
- **Logger**: Vibe Logger for structured logging

### Process Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│   Main Process      │◄──►│  Renderer Process   │
│   (Node.js)         │IPC │   (Chromium)        │
│                     │    │                     │
│ - File Operations   │    │ - UI Controller     │
│ - Replacement Engine│    │ - Event Handlers    │
│ - Config Management │    │ - Progress Display  │
│ - IPC Handlers      │    │ - Theme Management  │
└─────────────────────┘    └─────────────────────┘
           │                         │
           │                         │
     ┌─────▼─────┐              ┌────▼────┐
     │ Preload   │              │  HTML   │
     │ Script    │              │  CSS    │
     │ (Bridge)  │              │   JS    │
     └───────────┘              └─────────┘
```

### Security Model

- **Context Isolation**: Enabled for security
- **Node Integration**: Disabled in renderer
- **Preload Script**: Secure API bridge
- **Content Security Policy**: Strict CSP headers

## Development Environment Setup

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git
- Code editor (VS Code recommended)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sarap422/multi-grep-replacer.git
   cd multi-grep-replacer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install development tools (optional)**
   ```bash
   npm install -g electron
   npm install -g @electron-forge/cli
   ```

4. **Verify installation**
   ```bash
   npm run lint
   npm test
   npm start
   ```

### VS Code Setup

Recommended extensions:
- ESLint
- Prettier - Code formatter
- JavaScript (ES6) code snippets
- Electron debugger

Workspace settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript"],
  "files.associations": {
    "*.md": "markdown"
  }
}
```

### Environment Variables

Create a `.env` file in the project root:
```bash
NODE_ENV=development
DEBUG=multi-grep-replacer:*
ELECTRON_ENABLE_LOGGING=true
```

## Project Structure

```
multi-grep-replacer/
├── src/
│   ├── main/                    # Main process code
│   │   ├── main.js             # Application entry point
│   │   ├── config-manager.js    # Configuration management
│   │   ├── file-operations.js   # File system operations
│   │   ├── replacement-engine.js # Text replacement logic
│   │   ├── performance-optimizer.js # Performance optimizations
│   │   ├── memory-manager.js    # Memory management
│   │   └── debug-logger.js      # Debug logging system
│   ├── renderer/                # Renderer process code
│   │   ├── index.html          # Main UI layout
│   │   ├── css/                # Stylesheets
│   │   │   ├── main.css        # Main styles
│   │   │   ├── components.css  # Component styles
│   │   │   └── themes.css      # Theme definitions
│   │   └── js/                 # JavaScript modules
│   │       ├── app.js          # Application initialization
│   │       ├── ui-controller.js # UI event handling
│   │       ├── rule-manager.js  # Replacement rules UI
│   │       ├── file-explorer.js # File selection UI
│   │       └── execution-controller.js # Execution flow
│   └── preload/                 # Preload scripts
│       └── preload.js          # Secure API bridge
├── tests/                       # Test suites
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── e2e/                    # End-to-end tests
├── config/                      # Configuration files
│   ├── default.json            # Default configuration
│   └── samples/                # Sample configurations
├── build/                       # Build configuration
│   ├── electron-builder.config.js
│   └── entitlements.mac.plist
├── docs/                        # Documentation
├── logs/                        # Development logs
└── dist/                        # Build output (ignored)
```

## Core Components

### Main Process Components

#### ConfigManager
Handles configuration loading, saving, and validation.

```javascript
class ConfigManager {
  static async loadConfig(filePath) {
    // Load and validate configuration
  }
  
  static async saveConfig(config, filePath) {
    // Save configuration with validation
  }
  
  static validateConfig(config) {
    // Validate configuration structure
  }
}
```

#### FileOperations
Manages file system operations with permissions and error handling.

```javascript
class FileOperations {
  static async findFiles(directory, options) {
    // Recursive file search with filters
  }
  
  static async readFile(filePath) {
    // Read file with encoding detection
  }
  
  static async writeFile(filePath, content) {
    // Write file with error handling
  }
}
```

#### ReplacementEngine
Core text replacement logic with performance optimization.

```javascript
class ReplacementEngine {
  constructor(rules, options) {
    this.rules = rules;
    this.options = options;
    this.performanceOptimizer = new PerformanceOptimizer();
  }
  
  async processFiles(filePaths, progressCallback) {
    // Process multiple files with optimization
  }
}
```

### Renderer Process Components

#### UIController
Main UI coordination and event handling.

```javascript
class UIController {
  constructor() {
    this.ruleManager = new RuleManager();
    this.fileExplorer = new FileExplorer();
    this.executionController = new ExecutionController();
  }
  
  initialize() {
    // Initialize UI components and event listeners
  }
}
```

#### RuleManager
Manages replacement rules in the UI.

```javascript
class RuleManager {
  addRule(rule) {
    // Add rule to UI with validation
  }
  
  removeRule(ruleId) {
    // Remove rule from UI
  }
  
  getRules() {
    // Get all current rules
  }
}
```

### IPC Communication

#### Security-First Design
All communication uses the secure contextBridge pattern:

```javascript
// preload.js - Secure API exposure
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  executeReplacement: (config) => ipcRenderer.invoke('execute-replacement', config),
  onProgress: (callback) => ipcRenderer.on('replacement-progress', callback)
});

// main.js - IPC handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});
```

## Build and Deployment

### Development Build

```bash
# Start development server
npm start

# Run with debugging
npm run debug

# Run with verbose logging
DEBUG=* npm start
```

### Production Build

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:mac
npm run build:win
npm run build:linux

# Build for all platforms
npm run build:all
```

### Build Configuration

The build is configured in `build/electron-builder.config.js`:

```javascript
module.exports = {
  appId: 'com.multigrepreplacer.app',
  productName: 'Multi Grep Replacer',
  directories: {
    output: 'dist'
  },
  files: [
    'src/**/*',
    'config/**/*',
    'node_modules/**/*',
    '!**/*.{test,spec}.js',
    '!tests/**/*'
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    target: [
      { target: 'dmg', arch: ['universal'] }
    ]
  },
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] }
    ]
  },
  linux: {
    target: [
      { target: 'AppImage', arch: ['x64'] },
      { target: 'deb', arch: ['x64'] }
    ]
  }
};
```

### Code Signing (Production)

For production releases, configure code signing:

```javascript
// macOS
mac: {
  identity: "Developer ID Application: Your Name",
  entitlements: "build/entitlements.mac.plist",
  hardenedRuntime: true,
  notarize: true
}

// Windows
win: {
  certificateFile: "path/to/certificate.p12",
  certificatePassword: process.env.CSC_KEY_PASSWORD
}
```

## Testing

### Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── main/               # Main process tests
│   ├── renderer/           # Renderer process tests
│   └── shared/             # Shared utilities tests
├── integration/             # Integration tests
│   ├── ipc-communication.test.js
│   └── file-operations.test.js
└── e2e/                    # End-to-end tests
    └── user-workflows.test.js
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Test with coverage
npm run test:coverage
```

### Writing Tests

#### Unit Test Example
```javascript
// tests/unit/main/config-manager.test.js
const ConfigManager = require('../../../src/main/config-manager');

describe('ConfigManager', () => {
  test('should load valid configuration', async () => {
    const config = await ConfigManager.loadConfig('config/default.json');
    expect(config).toBeDefined();
    expect(config.app_info).toBeDefined();
  });

  test('should validate configuration structure', () => {
    const validConfig = { /* valid config */ };
    const result = ConfigManager.validateConfig(validConfig);
    expect(result.isValid).toBe(true);
  });
});
```

#### Integration Test Example
```javascript
// tests/integration/ipc-communication.test.js
const { ipcRenderer } = require('electron');

describe('IPC Communication', () => {
  test('should handle folder selection', async () => {
    const result = await ipcRenderer.invoke('select-folder');
    expect(result).toHaveProperty('path');
    expect(result).toHaveProperty('canceled');
  });
});
```

### Performance Testing

```javascript
// tests/performance/replacement-engine.test.js
const PerformanceTestSuite = require('../../../src/main/performance-test');

describe('Performance Tests', () => {
  test('should process 1000 files within 30 seconds', async () => {
    const testSuite = new PerformanceTestSuite();
    const result = await testSuite.runFileProcessingTest();
    
    expect(result.duration).toBeLessThan(30000);
    expect(result.filesProcessed).toBe(1000);
    expect(result.throughput).toBeGreaterThan(33); // files per second
  });
});
```

## Debugging

### Debug Configuration

#### VS Code Debug Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/main/main.js",
      "args": ["--remote-debugging-port=9222"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Debug Renderer Process",
      "type": "chrome",
      "request": "attach",
      "port": 9222,
      "webRoot": "${workspaceFolder}/src/renderer"
    }
  ]
}
```

### Logging and Monitoring

#### Vibe Logger Integration
```javascript
// src/main/debug-logger.js
const { createFileLogger } = require('vibelogger');

class DebugLogger {
  constructor() {
    this.vibeLogger = createFileLogger('multi-grep-replacer');
  }
  
  logOperation(operation, data, options = {}) {
    this.vibeLogger.info(operation, `Operation: ${operation}`, {
      context: data,
      ...options
    });
  }
}
```

#### Performance Monitoring
```javascript
// Monitor UI responsiveness
const performanceMonitor = new PerformanceMonitor();
performanceMonitor.trackUIResponse('button-click', () => {
  // Button click handler
});
```

### Debugging Common Issues

#### Memory Leaks
```javascript
// Use memory manager to track leaks
const memoryManager = new MemoryManager();
memoryManager.startMonitoring();

// Check for memory leaks periodically
setInterval(() => {
  const usage = memoryManager.getCurrentMemoryUsage();
  if (usage.heapUsed > MEMORY_WARNING_THRESHOLD) {
    console.warn('Potential memory leak detected');
  }
}, 10000);
```

#### IPC Communication Issues
```javascript
// Add detailed IPC logging
ipcMain.handle('test-handler', async (event, ...args) => {
  vibeLogger.info('ipc_request', 'IPC request received', {
    context: { handler: 'test-handler', args }
  });
  
  try {
    const result = await processRequest(...args);
    vibeLogger.info('ipc_response', 'IPC response sent', {
      context: { handler: 'test-handler', result }
    });
    return result;
  } catch (error) {
    vibeLogger.error('ipc_error', 'IPC error occurred', {
      context: { handler: 'test-handler', error: error.message }
    });
    throw error;
  }
});
```

### Chrome DevTools

Access Chrome DevTools for the renderer process:
```javascript
// In main.js
if (isDevelopment) {
  mainWindow.webContents.openDevTools();
}
```

## Extension Development

*Note: Extension API will be available in version 2.0*

### Plugin Architecture

```javascript
// Future plugin interface
class Plugin {
  constructor(context) {
    this.context = context;
  }
  
  activate() {
    // Plugin activation logic
    this.context.registerCommand('my-command', this.handleCommand);
    this.context.registerReplacementProvider(this.myProvider);
  }
  
  deactivate() {
    // Cleanup logic
  }
}
```

### Custom Replacement Providers

```javascript
class CustomReplacementProvider {
  canHandle(rule) {
    return rule.type === 'custom';
  }
  
  async process(content, rule) {
    // Custom processing logic
    return processedContent;
  }
}
```

## Contributing Guidelines

### Code Style

We use ESLint and Prettier for consistent code formatting:

```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended'],
  env: {
    node: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error'
  }
};
```

### Git Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes with descriptive commits
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Push changes: `git push origin feature/my-feature`
7. Create a pull request

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(ui): add dark mode support

Added automatic theme detection based on system preferences.
Includes manual theme toggle in settings.

Closes #123
```

### Pull Request Guidelines

1. **Description**: Clear description of changes
2. **Testing**: All tests must pass
3. **Documentation**: Update relevant documentation
4. **Performance**: Consider performance implications
5. **Breaking Changes**: Clearly mark breaking changes

### Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions will build and create release

---

*Last updated: 2025-08-18 | Version 1.0.0*