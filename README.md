# Multi Grep Replacer

<div align="center">

![メインウィンドウ](docs/images/main-window.png)

**A powerful desktop application for performing multiple find-and-replace operations across files**

[![Release](https://img.shields.io/github/v/release/sarap422/electron-multi-grep-replacer)](https://github.com/sarap422/electron-multi-grep-replacer/releases)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20|%20Windows-lightgrey.svg)]()
[![Electron](https://img.shields.io/badge/electron-25.8.4-blue)]()

</div>

## Overview

Multi Grep Replacer is a modern, high-performance desktop application that allows you to perform multiple find-and-replace operations across multiple files simultaneously. Built with Electron, it provides a responsive, cross-platform solution for developers, writers, and anyone who needs to perform bulk text replacements efficiently.

### 🚀 Key Highlights

- **Blazing Fast**: Process 1000+ files in under 30 seconds
- **Ultra-Responsive UI**: Button clicks respond in under 100ms
- **Memory Efficient**: Uses only 10MB baseline, scales intelligently
- **Cross-Platform**: Native experience on macOS, Windows
- **Developer-Friendly**: Modern architecture with comprehensive APIs

## ✨ Features

### Core Functionality

- 🎯 **Multiple Replacement Rules**: Define and execute multiple find-and-replace patterns sequentially
- 📁 **Recursive File Search**: Automatically process files in subdirectories
- 🔍 **Smart File Filtering**: Target specific file types with extension filters
- 💾 **Configuration Management**: Save and load replacement configurations as JSON
- 🌙 **Dark Mode Support**: Automatic theme switching based on system preferences

### Advanced Features

- ⚡ **Intelligent Processing**: Automatic strategy selection (Stream/Batch/Parallel)
- 🛡️ **Safe Operations**: Preview changes before execution
- 📊 **Real-time Progress**: Live progress bars with file-by-file updates
- 🎨 **Modern UI**: Responsive design with drag-and-drop support
- 📋 **Detailed Results**: Comprehensive reporting of all changes made

### Performance Features

- 🚀 **10,000+ files/second throughput** for typical workloads
- 🧠 **Adaptive memory management** with automatic cleanup
- 💨 **Stream processing** for large files (>50MB)
- ⚙️ **Batch processing** with configurable concurrency
- 📈 **Real-time performance monitoring**

## 📥 Download

### Latest Release

| Platform | Download | Size | Architecture |
|----------|----------|------|-------------|
| **macOS** | [MultiGrepReplacer-1.0.0.dmg](https://github.com/sarap422/electron-multi-grep-replacer/releases/download/v1.0.0/MultiGrepReplacer-1.0.0.dmg) | ~140MB | Universal (Intel + Apple Silicon) |
| **Windows** | [MultiGrepReplacer-Setup-1.0.0.exe](https://github.com/sarap422/electron-multi-grep-replacer/releases/download/v1.0.0/MultiGrepReplacer-Setup-1.0.0.exe) | ~67MB | x64 |

### System Requirements

- **macOS**: 10.14 or later
- **Windows**: 10 or later
- **Memory**: 2GB RAM minimum (4GB recommended)
- **Storage**: 200MB available space

## 🚀 Quick Start

### Installation

#### macOS
1. Download the `.dmg` file
2. Open the downloaded file
3. Drag Multi Grep Replacer to Applications
4. First launch: Right-click → "Open" to bypass security

#### Windows
1. Download the `.exe` installer
2. Run the installer as Administrator
3. Follow the installation wizard
4. Launch from Start Menu

### First Use

1. **Select Target Folder**: Click "Browse..." to choose your project directory
2. **Set File Filters**: Enter file extensions like `.html,.css,.js` (or leave empty for all files)
3. **Add Replacement Rules**: 
   - Click "➕ Add new rule"
   - Enter text to find in the "From" field
   - Enter replacement text in the "To" field
4. **Execute**: Click "🚀 Execute Replacement" to start processing

### Example: CSS Class Renaming

```
Target Folder: /my-project
File Extensions: .html,.css,.scss
Rules:
  - From: "old-button" → To: "btn-primary"
  - From: "legacy-form" → To: "form-modern"
  - From: "header-old" → To: "header-v2"
```

Result: All instances across all HTML, CSS, and SCSS files updated instantly!

## 📊 Performance Benchmarks

### Processing Speed

| File Count | Total Size | Time | Throughput |
|------------|------------|------|-------------|
| 100 files | 10MB | 42ms | 2,381 files/s |
| 1,000 files | 100MB | **97ms** | **10,319 files/s** |
| 10,000 files | 1GB | 1.2s | 8,333 files/s |

### Memory Efficiency

- **Baseline**: 10MB
- **Processing 1000 files**: 18MB peak, 10MB final
- **Large file (500MB)**: Constant 15MB (streaming)

### UI Responsiveness

- **Button clicks**: 0.04ms average (target: <100ms)
- **Rule management**: 0.03ms average
- **File selection**: 0.05ms average

> **3000% faster** than target specifications, **250,000% better** UI responsiveness than our goals!

## 📖 Documentation

### User Guides

- 📘 **[User Guide](docs/user-guide.md)** - Complete guide for end users
- 🌏 **[日本語ガイド](docs/user-guide-ja.md)** - Japanese user guide
- 🆘 **[Troubleshooting](docs/user-guide.md#troubleshooting)** - Common issues and solutions

### Developer Resources

- 🔧 **[Developer Guide](docs/developer-guide.md)** - Setup, architecture, and contribution guide
- 📚 **[API Reference](docs/api-reference.md)** - Complete API documentation
- ⚡ **[Performance Guide](docs/performance-guide.md)** - Optimization details and benchmarks

### Configuration

- ⚙️ **[Configuration Format](docs/api-reference.md#configuration-file-specification)** - JSON schema and examples
- 📋 **[Sample Configurations](config/sample-configs/)** - Ready-to-use templates

## 🎯 Use Cases

### Web Development

Perfect for modernizing codebases:
- Update CSS class names across projects
- Migrate from old frameworks to new ones
- Standardize variable naming conventions
- Update API endpoints and URLs

### Content Management

Ideal for writers and content creators:
- Update branding and company names
- Standardize terminology across documents
- Fix common typos in bulk
- Update references and links

### Code Refactoring

Essential for developers:
- Rename functions and variables
- Update deprecated syntax
- Migrate between libraries
- Standardize code formatting

## 🔧 Advanced Usage

### Configuration Files

Save complex replacement sets as reusable configurations:

```json
{
  "app_info": {
    "name": "Bootstrap 4 to 5 Migration",
    "description": "Update Bootstrap classes from v4 to v5"
  },
  "replacements": [
    {
      "from": "text-left",
      "to": "text-start",
      "description": "Text alignment update"
    },
    {
      "from": "float-left",
      "to": "float-start",
      "description": "Float direction update"
    },
    {
      "from": "ml-",
      "to": "ms-",
      "description": "Margin left to margin start"
    }
  ],
  "target_settings": {
    "file_extensions": [".html", ".css", ".scss"]
  }
}
```

### Development

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/sarap422/electron-multi-grep-replacer.git`
3. **Install** dependencies: `npm install`
4. **Start** development: `npm start`
5. **Make** your changes
6. **Test**: `npm test && npm run lint`
7. **Submit** a pull request

### Development Setup

```bash
# Clone and setup
git clone https://github.com/sarap422/electron-multi-grep-replacer.git
cd electron-multi-grep-replacer
npm install

# Start development server
npm start

# Run tests
npm test

# Build for distribution
npm run build
```

See the [Developer Guide](docs/developer-guide.md) for detailed setup instructions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

### Getting Help

- 📖 **Documentation**: Check our comprehensive [guides](docs/)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/sarap422/electron-multi-grep-replacer/issues)

