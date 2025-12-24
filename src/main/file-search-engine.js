const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const DebugLogger = require('./debug-logger');

// Constants
const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.vscode',
  'dist',
  'build',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  '*.tmp',
  '*.temp',
  '*.cache',
  '.idea',
  '.vs',
  '__pycache__',
  '.pytest_cache',
  '.nyc_output',
  'coverage',
  '.next',
  '.nuxt',
  '.svelte-kit',
];

const MAX_CONCURRENT_OPERATIONS = 10;
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const PROGRESS_UPDATE_INTERVAL_MS = 100;

class FileSearchEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.excludePatterns = options.excludePatterns || DEFAULT_EXCLUDE_PATTERNS;
    this.maxFileSize = options.maxFileSize || MAX_FILE_SIZE_BYTES;
    this.maxConcurrency = options.maxConcurrency || MAX_CONCURRENT_OPERATIONS;
    this.searchAbortController = null;
    this.lastProgressUpdate = 0;
    this.cache = new Map();
    this.stats = {
      totalFiles: 0,
      totalDirectories: 0,
      skippedFiles: 0,
      errors: [],
    };
  }

  async searchFiles(directory, extensions = [], _options = {}) {
    const searchId = `search-${Date.now()}`;

    try {
      // Initialize search
      await DebugLogger.info('File search started', {
        searchId,
        directory,
        extensions,
        excludePatterns: this.excludePatterns.slice(0, 5), // Log first 5 patterns
        maxFileSize: `${MAX_FILE_SIZE_MB}MB`,
        timestamp: new Date().toISOString(),
      });

      DebugLogger.startPerformance(searchId);

      // Reset stats
      this.stats = {
        totalFiles: 0,
        totalDirectories: 0,
        skippedFiles: 0,
        errors: [],
      };

      // Create abort controller for cancellation
      this.searchAbortController = new AbortController();

      // Validate directory
      await this._validateDirectory(directory);

      // Normalize extensions
      const normalizedExtensions = this._normalizeExtensions(extensions);

      // Perform search
      const results = [];
      await this._searchRecursive(directory, normalizedExtensions, results, searchId);

      // Log completion
      const performanceResult = await DebugLogger.endPerformance(searchId);
      const duration = performanceResult?.duration || 0;

      await DebugLogger.info('File search completed', {
        searchId,
        filesFound: results.length,
        stats: this.stats,
        duration: `${duration}ms`,
        filesPerSecond: duration > 0 ? Math.round((results.length / duration) * 1000) : 0,
      });

      return {
        files: results,
        stats: this.stats,
      };
    } catch (error) {
      await DebugLogger.error('File search failed', {
        searchId,
        error: error.message,
        stack: error.stack,
        directory,
      });
      throw error;
    } finally {
      this.searchAbortController = null;
    }
  }

  async _validateDirectory(directory) {
    try {
      const stats = await fs.stat(directory);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${directory}`);
      }

      // Check read permissions
      await fs.access(directory, fs.constants.R_OK);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Directory not found: ${directory}`);
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied: ${directory}`);
      }
      throw error;
    }
  }

  _normalizeExtensions(extensions) {
    if (!extensions || extensions.length === 0) {
      return [];
    }

    return extensions.map(ext => {
      // Remove any whitespace
      ext = ext.trim();
      // Ensure extension starts with a dot
      return ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    });
  }

  async _searchRecursive(directory, extensions, results, searchId, depth = 0) {
    // Check if search was cancelled
    if (this.searchAbortController?.signal.aborted) {
      throw new Error('Search cancelled');
    }

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      this.stats.totalDirectories++;

      // Process entries in batches for better performance
      const batchSize = 10;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async entry => {
            const fullPath = path.join(directory, entry.name);

            try {
              if (entry.isDirectory()) {
                // Check if directory should be excluded
                if (!this._shouldExclude(entry.name, fullPath)) {
                  await this._searchRecursive(fullPath, extensions, results, searchId, depth + 1);
                } else {
                  await DebugLogger.trace('Directory excluded', {
                    path: fullPath,
                    reason: 'matches exclude pattern',
                  });
                }
              } else if (entry.isFile()) {
                // Process file
                await this._processFile(fullPath, entry.name, extensions, results);
              }
            } catch (error) {
              // Log individual file/directory errors but continue
              this.stats.errors.push({
                path: fullPath,
                error: error.message,
              });

              await DebugLogger.debug('Error processing entry', {
                path: fullPath,
                error: error.message,
              });
            }
          })
        );

        // Update progress periodically
        this._updateProgress(results.length);

        // Give UI thread a chance to update
        if (i % 100 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        // Permission denied - log but continue
        this.stats.errors.push({
          path: directory,
          error: 'Permission denied',
        });

        await DebugLogger.debug('Directory access denied', {
          directory,
          error: error.code,
        });
      } else {
        // Re-throw other errors
        throw error;
      }
    }
  }

  async _processFile(fullPath, filename, extensions, results) {
    try {
      // Check file extension
      if (!this._matchesExtension(filename, extensions)) {
        return;
      }

      // Check file size
      const stats = await fs.stat(fullPath);

      if (stats.size > this.maxFileSize) {
        this.stats.skippedFiles++;
        await DebugLogger.debug('File skipped due to size', {
          path: fullPath,
          size: `${Math.round(stats.size / 1024 / 1024)}MB`,
          limit: `${MAX_FILE_SIZE_MB}MB`,
        });
        return;
      }

      // Check read/write permissions
      try {
        await fs.access(fullPath, fs.constants.R_OK | fs.constants.W_OK);
      } catch (error) {
        this.stats.skippedFiles++;
        await DebugLogger.debug('File skipped due to permissions', {
          path: fullPath,
          error: error.code,
        });
        return;
      }

      // Add to results
      results.push({
        path: fullPath,
        name: filename,
        size: stats.size,
        modified: stats.mtime,
      });

      this.stats.totalFiles++;
    } catch (error) {
      this.stats.errors.push({
        path: fullPath,
        error: error.message,
      });
    }
  }

  _shouldExclude(name, _fullPath) {
    // Check against exclude patterns
    return this.excludePatterns.some(pattern => {
      // Simple pattern matching (could be enhanced with glob patterns)
      if (pattern.includes('*')) {
        // Basic wildcard support
        const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
        return regex.test(name);
      }
      return name === pattern || name.startsWith(`${pattern}.`);
    });
  }

  _matchesExtension(filename, extensions) {
    if (!extensions || extensions.length === 0) {
      return true; // Include all files if no extensions specified
    }

    const ext = path.extname(filename).toLowerCase();
    return extensions.includes(ext);
  }

  _updateProgress(fileCount) {
    const now = Date.now();
    if (now - this.lastProgressUpdate > PROGRESS_UPDATE_INTERVAL_MS) {
      this.emit('progress', {
        filesFound: fileCount,
        directoriesScanned: this.stats.totalDirectories,
        errors: this.stats.errors.length,
      });
      this.lastProgressUpdate = now;
    }
  }

  cancelSearch() {
    if (this.searchAbortController) {
      this.searchAbortController.abort();
      DebugLogger.info('File search cancelled by user');
    }
  }

  clearCache() {
    this.cache.clear();
    DebugLogger.info('File search cache cleared');
  }

  getStats() {
    return { ...this.stats };
  }
}

module.exports = FileSearchEngine;
