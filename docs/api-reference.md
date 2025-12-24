# Multi Grep Replacer API Reference

## Overview

This document describes the internal API architecture of Multi Grep Replacer, including IPC communication between main and renderer processes, configuration file formats, and public APIs for extensions.

## Table of Contents

1. [IPC API](#ipc-api)
2. [Main Process API](#main-process-api)
3. [Renderer Process API](#renderer-process-api)
4. [Configuration File Specification](#configuration-file-specification)
5. [Events](#events)
6. [Error Codes](#error-codes)

## IPC API

The communication between main and renderer processes uses Electron's IPC (Inter-Process Communication) system with contextBridge for security.

### File Operations

#### `select-folder`
Displays a native folder selection dialog.

**Request:**
```javascript
await window.electronAPI.selectFolder()
```

**Response:**
```javascript
{
  success: true,
  path: "/path/to/selected/folder",
  canceled: false
}
```

#### `search-files`
Searches for files in the specified directory with optional filters.

**Request:**
```javascript
await window.electronAPI.searchFiles({
  directory: "/path/to/search",
  extensions: [".html", ".css", ".js"],
  recursive: true,
  excludePatterns: ["node_modules", ".git"]
})
```

**Response:**
```javascript
{
  success: true,
  files: [
    {
      path: "/path/to/file1.html",
      name: "file1.html",
      size: 1024,
      modified: "2025-08-18T10:00:00.000Z"
    }
  ],
  totalCount: 1,
  totalSize: 1024
}
```

#### `execute-replacement`
Executes the replacement operation with specified rules.

**Request:**
```javascript
await window.electronAPI.executeReplacement({
  targetDirectory: "/path/to/files",
  rules: [
    {
      id: "rule_1",
      from: "old-text",
      to: "new-text",
      enabled: true,
      caseSensitive: true
    }
  ],
  options: {
    fileExtensions: [".html", ".css"],
    dryRun: false,
    maxConcurrentFiles: 10
  }
})
```

**Response:**
```javascript
{
  success: true,
  summary: {
    totalFiles: 5,
    modifiedFiles: 3,
    totalReplacements: 15,
    executionTime: 1247
  },
  details: [
    {
      path: "/path/to/file1.html",
      changes: 3,
      replacements: [
        {
          rule: "rule_1",
          from: "old-text",
          to: "new-text",
          count: 3,
          positions: [
            { line: 1, column: 5 },
            { line: 3, column: 12 },
            { line: 7, column: 8 }
          ]
        }
      ]
    }
  ]
}
```

### Configuration Management

#### `load-config`
Loads a configuration file.

**Request:**
```javascript
await window.electronAPI.loadConfig({
  filePath: "/path/to/config.json"
})
```

**Response:**
```javascript
{
  success: true,
  config: {
    // Configuration object structure
  }
}
```

#### `save-config`
Saves the current configuration to a file.

**Request:**
```javascript
await window.electronAPI.saveConfig({
  filePath: "/path/to/config.json",
  config: {
    // Configuration object
  }
})
```

**Response:**
```javascript
{
  success: true,
  filePath: "/path/to/config.json"
}
```

### System Information

#### `get-app-info`
Retrieves application information.

**Request:**
```javascript
await window.electronAPI.getAppInfo()
```

**Response:**
```javascript
{
  name: "Multi Grep Replacer",
  version: "1.0.0",
  electron: "25.0.0",
  node: "18.15.0",
  platform: "darwin",
  arch: "arm64"
}
```

#### `get-performance-stats`
Retrieves current performance statistics.

**Request:**
```javascript
await window.electronAPI.getPerformanceStats()
```

**Response:**
```javascript
{
  memory: {
    heapUsed: 45678912,
    heapTotal: 67108864,
    external: 1234567,
    rss: 89012345
  },
  cpu: {
    usage: 12.5,
    loadAverage: [1.2, 1.1, 0.9]
  },
  files: {
    cached: 156,
    processed: 1247
  }
}
```

## Main Process API

### FileOperations

#### `FileOperations.findFiles(directory, options)`
Recursively finds files in a directory.

**Parameters:**
- `directory` (string): Target directory path
- `options` (object):
  - `extensions` (string[]): File extensions to include
  - `excludePatterns` (string[]): Patterns to exclude
  - `recursive` (boolean): Include subdirectories
  - `maxFiles` (number): Maximum number of files to find

**Returns:** Promise\<FileInfo[]\>

#### `FileOperations.readFile(filePath)`
Reads file contents with encoding detection.

**Parameters:**
- `filePath` (string): Path to file

**Returns:** Promise\<string\>

#### `FileOperations.writeFile(filePath, content)`
Writes content to file with UTF-8 encoding.

**Parameters:**
- `filePath` (string): Path to file
- `content` (string): Content to write

**Returns:** Promise\<void\>

#### `FileOperations.checkPermissions(filePath)`
Checks read/write permissions for a file.

**Parameters:**
- `filePath` (string): Path to file

**Returns:** Promise\<PermissionInfo\>

```javascript
{
  readable: true,
  writable: true,
  exists: true,
  isDirectory: false
}
```

### ReplacementEngine

#### `ReplacementEngine.processFiles(filePaths, rules, options)`
Processes multiple files with replacement rules.

**Parameters:**
- `filePaths` (string[]): Array of file paths
- `rules` (ReplacementRule[]): Array of replacement rules
- `options` (ProcessingOptions): Processing options

**Returns:** Promise\<ReplacementResult\>

#### `ReplacementEngine.processFile(filePath, rules)`
Processes a single file with replacement rules.

**Parameters:**
- `filePath` (string): Path to file
- `rules` (ReplacementRule[]): Array of replacement rules

**Returns:** Promise\<FileReplacementResult\>

### ConfigManager

#### `ConfigManager.loadConfig(filePath)`
Loads configuration from JSON file.

**Parameters:**
- `filePath` (string): Path to configuration file

**Returns:** Promise\<Configuration\>

#### `ConfigManager.saveConfig(config, filePath)`
Saves configuration to JSON file.

**Parameters:**
- `config` (Configuration): Configuration object
- `filePath` (string): Path to save file

**Returns:** Promise\<void\>

#### `ConfigManager.validateConfig(config)`
Validates configuration object structure.

**Parameters:**
- `config` (object): Configuration to validate

**Returns:** ValidationResult

## Renderer Process API

### UIController

#### `UIController.addReplacementRule(rule)`
Adds a new replacement rule to the UI.

**Parameters:**
- `rule` (ReplacementRule): Rule to add

**Returns:** string (rule ID)

#### `UIController.removeReplacementRule(ruleId)`
Removes a replacement rule from the UI.

**Parameters:**
- `ruleId` (string): ID of rule to remove

**Returns:** boolean

#### `UIController.updateReplacementRule(ruleId, updates)`
Updates an existing replacement rule.

**Parameters:**
- `ruleId` (string): ID of rule to update
- `updates` (Partial\<ReplacementRule\>): Updates to apply

**Returns:** boolean

### ProgressDisplay

#### `ProgressDisplay.show(totalFiles)`
Shows the progress display.

**Parameters:**
- `totalFiles` (number): Total number of files to process

**Returns:** void

#### `ProgressDisplay.update(current, total, currentFile)`
Updates progress information.

**Parameters:**
- `current` (number): Current file index
- `total` (number): Total number of files
- `currentFile` (string): Name of current file being processed

**Returns:** void

#### `ProgressDisplay.hide()`
Hides the progress display.

**Returns:** void

## Configuration File Specification

### Root Structure

```json
{
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "app_info": {
    "name": "string",
    "version": "string",
    "created_at": "ISO8601 datetime",
    "description": "string",
    "author": "string",
    "tags": ["string"]
  },
  "replacements": [ReplacementRule],
  "target_settings": TargetSettings,
  "replacement_settings": ReplacementSettings,
  "ui_settings": UISettings,
  "advanced_settings": AdvancedSettings
}
```

### ReplacementRule

```json
{
  "id": "string",
  "from": "string",
  "to": "string",
  "enabled": "boolean",
  "description": "string?",
  "case_sensitive": "boolean",
  "whole_word": "boolean",
  "use_regex": "boolean"
}
```

### TargetSettings

```json
{
  "file_extensions": ["string"],
  "exclude_patterns": ["string"],
  "include_subdirectories": "boolean",
  "max_file_size": "number",
  "encoding": "string"
}
```

### ReplacementSettings

```json
{
  "case_sensitive": "boolean",
  "use_regex": "boolean",
  "backup_enabled": "boolean",
  "preserve_file_permissions": "boolean",
  "dry_run": "boolean"
}
```

### UISettings

```json
{
  "theme": "light|dark|auto",
  "window": {
    "width": "number",
    "height": "number",
    "resizable": "boolean",
    "center": "boolean"
  },
  "remember_last_folder": "boolean",
  "auto_save_config": "boolean",
  "show_file_count_preview": "boolean",
  "confirm_before_execution": "boolean"
}
```

### AdvancedSettings

```json
{
  "max_concurrent_files": "number",
  "progress_update_interval": "number",
  "log_level": "debug|info|warn|error",
  "enable_crash_reporting": "boolean",
  "memory_limit": "number",
  "timeout": "number"
}
```

## Events

### Main Process Events

#### `replacement-progress`
Emitted during file processing to report progress.

**Data:**
```javascript
{
  current: 5,
  total: 100,
  currentFile: "/path/to/file.html",
  replacements: 12,
  elapsedTime: 5432
}
```

#### `replacement-complete`
Emitted when replacement operation completes.

**Data:**
```javascript
{
  success: true,
  summary: ReplacementSummary,
  details: FileReplacementResult[]
}
```

#### `error`
Emitted when an error occurs.

**Data:**
```javascript
{
  code: "ERROR_CODE",
  message: "Error description",
  details: {},
  stack: "Error stack trace"
}
```

### Renderer Process Events

#### `ui-rule-added`
Emitted when a replacement rule is added.

**Data:**
```javascript
{
  ruleId: "rule_123",
  rule: ReplacementRule
}
```

#### `ui-rule-removed`
Emitted when a replacement rule is removed.

**Data:**
```javascript
{
  ruleId: "rule_123"
}
```

#### `ui-config-loaded`
Emitted when a configuration is loaded.

**Data:**
```javascript
{
  filePath: "/path/to/config.json",
  config: Configuration
}
```

## Error Codes

### File Operation Errors

- `FILE_NOT_FOUND`: Specified file does not exist
- `FILE_ACCESS_DENIED`: Permission denied accessing file
- `FILE_TOO_LARGE`: File exceeds maximum size limit
- `FILE_ENCODING_ERROR`: File encoding not supported
- `DIRECTORY_NOT_FOUND`: Target directory does not exist
- `DIRECTORY_ACCESS_DENIED`: Permission denied accessing directory

### Replacement Errors

- `INVALID_RULE`: Replacement rule is invalid
- `REPLACEMENT_FAILED`: Replacement operation failed
- `NO_FILES_FOUND`: No files found matching criteria
- `EXECUTION_TIMEOUT`: Operation timed out
- `MEMORY_LIMIT_EXCEEDED`: Memory usage exceeded limit

### Configuration Errors

- `CONFIG_FILE_NOT_FOUND`: Configuration file not found
- `CONFIG_INVALID_FORMAT`: Configuration file format invalid
- `CONFIG_VALIDATION_FAILED`: Configuration validation failed
- `CONFIG_SAVE_FAILED`: Failed to save configuration

### System Errors

- `INSUFFICIENT_MEMORY`: System memory insufficient
- `DISK_SPACE_LOW`: Disk space insufficient
- `PROCESS_CRASHED`: Process crashed unexpectedly
- `IPC_COMMUNICATION_FAILED`: IPC communication failed

## Type Definitions

### TypeScript Interfaces

```typescript
interface FileInfo {
  path: string;
  name: string;
  size: number;
  modified: string;
}

interface ReplacementRule {
  id: string;
  from: string;
  to: string;
  enabled: boolean;
  description?: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

interface ReplacementResult {
  success: boolean;
  summary: {
    totalFiles: number;
    modifiedFiles: number;
    totalReplacements: number;
    executionTime: number;
  };
  details: FileReplacementResult[];
}

interface FileReplacementResult {
  path: string;
  changes: number;
  replacements: {
    rule: string;
    from: string;
    to: string;
    count: number;
    positions: { line: number; column: number }[];
  }[];
  error?: string;
}

interface ProcessingOptions {
  fileExtensions?: string[];
  dryRun?: boolean;
  maxConcurrentFiles?: number;
  timeout?: number;
}

interface PermissionInfo {
  readable: boolean;
  writable: boolean;
  exists: boolean;
  isDirectory: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

## Extension API (Future)

*Note: Extension API is planned for version 2.0*

### Plugin Interface

```typescript
interface Plugin {
  name: string;
  version: string;
  activate(context: PluginContext): void;
  deactivate(): void;
}

interface PluginContext {
  subscriptions: Disposable[];
  registerCommand(command: string, callback: Function): Disposable;
  registerReplacementProvider(provider: ReplacementProvider): Disposable;
}
```

---

*Last updated: 2025-08-18 | Version 1.0.0*