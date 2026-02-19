const fs = require('fs').promises;
const path = require('path');
const { dialog } = require('electron');
const DebugLogger = require('./debug-logger');

/**
 * Multi Grep Replacer - File Operations
 * ファイルシステム操作API
 */
class FileOperations {
  // ファイルサイズ制限設定
  static MAX_FILE_SIZE_MB = 100; // MB
  static MAX_FILE_SIZE = FileOperations.MAX_FILE_SIZE_MB * 1024 * 1024; // bytes

  // 除外パターンのデフォルト
  static DEFAULT_EXCLUDE_PATTERNS = [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    '*.min.js',
    '*.min.css',
    '.DS_Store',
    'Thumbs.db',
  ];

  // 一時ファイル生成設定
  static RANDOM_ID_START_INDEX = 2; // ランダムID開始位置
  static RANDOM_ID_END_INDEX = 8; // ランダムID終了位置
  static RANDOM_ID_RADIX = 36; // ランダムID基数

  // DebugLogger統合ヘルパー
  static async logOperation(operation, data, result) {
    const level = result.success ? 'info' : 'error';
    await DebugLogger[level](`FileOperations: ${operation}`, {
      component: 'FileOperations',
      operation,
      ...data,
      ...result,
    });
  }

  /**
   * フォルダ選択ダイアログ
   * @param {BrowserWindow} browserWindow - 親ウィンドウ
   * @returns {Promise<string|null>} 選択されたフォルダパス
   */
  static async selectFolder(browserWindow) {
    const operationId = 'file-select-folder';
    DebugLogger.startPerformance(operationId);

    try {
      await DebugLogger.debug('Opening folder selection dialog');

      const result = await dialog.showOpenDialog(browserWindow, {
        title: 'Select Target Folder',
        buttonLabel: 'Select Folder',
        properties: ['openDirectory', 'createDirectory'],
        message: 'Select the folder to search for files',
      });

      if (result.canceled) {
        await DebugLogger.endPerformance(operationId, {
          canceled: true,
          selectedPath: null,
        });
        await DebugLogger.debug('Folder selection canceled by user');
        return null;
      }

      const [selectedPath] = result.filePaths;
      await DebugLogger.endPerformance(operationId, {
        selectedPath,
        success: true,
      });
      await DebugLogger.info('Folder selected successfully', { selectedPath });

      return selectedPath;
    } catch (error) {
      await DebugLogger.logError(error, {
        operation: 'selectFolder',
        component: 'FileOperations',
      });
      await DebugLogger.endPerformance(operationId, { success: false });

      throw new Error(`フォルダ選択エラー: ${error.message}`);
    }
  }

  /**
   * 設定ファイル読み込みダイアログ
   * @param {BrowserWindow} browserWindow - 親ウィンドウ
   * @returns {Promise<string|null>} 選択されたファイルパス
   */
  static async selectLoadConfigFile(browserWindow) {
    const operationId = 'file-select-load-config';
    DebugLogger.startPerformance(operationId);

    try {
      await DebugLogger.debug('Opening load config dialog');

      const result = await dialog.showOpenDialog(browserWindow, {
        title: 'Load Configuration',
        buttonLabel: 'Load',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        await DebugLogger.endPerformance(operationId, {
          canceled: true,
          selectedPath: null,
        });
        await DebugLogger.debug('Load config dialog canceled by user');
        return null;
      }

      const [selectedPath] = result.filePaths;
      await DebugLogger.endPerformance(operationId, {
        selectedPath,
        success: true,
      });
      await DebugLogger.info('Load path selected successfully', { selectedPath });

      return selectedPath;
    } catch (error) {
      await DebugLogger.endPerformance(operationId, { success: false });
      await DebugLogger.logError(error, {
        operation: 'selectLoadConfigFile',
        component: 'FileOperations',
      });

      throw new Error(`ファイル選択エラー: ${error.message}`);
    }
  }

  /**
   * 設定ファイル保存ダイアログ
   * @param {BrowserWindow} browserWindow - 親ウィンドウ
   * @returns {Promise<string|null>} 選択されたファイルパス
   */
  static async selectSaveConfigFile(browserWindow) {
    const operationId = 'file-select-save-config';
    DebugLogger.startPerformance(operationId);

    try {
      await DebugLogger.debug('Opening save config dialog');

      const result = await dialog.showSaveDialog(browserWindow, {
        title: 'Save Configuration',
        defaultPath: 'multi-grep-replacer-config.json',
        buttonLabel: 'Save',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation'],
      });

      if (result.canceled) {
        await DebugLogger.endPerformance(operationId, {
          canceled: true,
          selectedPath: null,
        });
        await DebugLogger.debug('Save config dialog canceled by user');
        return null;
      }

      const selectedPath = result.filePath;
      await DebugLogger.endPerformance(operationId, {
        selectedPath,
        success: true,
      });
      await DebugLogger.info('Save path selected successfully', { selectedPath });

      return selectedPath;
    } catch (error) {
      await DebugLogger.logError(error, {
        operation: 'selectSaveConfigFile',
        component: 'FileOperations',
      });
      await DebugLogger.endPerformance(operationId, { success: false });

      throw new Error(`設定保存ダイアログエラー: ${error.message}`);
    }
  }

  /**
   * ディレクトリ内のファイルを再帰的に検索
   * @param {string} directory - 検索対象ディレクトリ
   * @param {Array<string>} extensions - 対象拡張子リスト
   * @param {Array<string>} excludePatterns - 除外パターン
   * @returns {Promise<Array>} ファイルパスのリスト
   */
  static async findFiles(directory, extensions = [], excludePatterns = []) {
    const operationId = 'file-find-files';
    DebugLogger.startPerformance(operationId);
    const files = [];

    try {
      await DebugLogger.info('Searching files', {
        directory,
        extensions,
        excludePatterns: excludePatterns.length,
      });

      // デフォルト除外パターンとマージ
      const allExcludePatterns = [...this.DEFAULT_EXCLUDE_PATTERNS, ...excludePatterns];

      // 再帰的にファイルを検索
      await this.scanDirectory(directory, files, extensions, allExcludePatterns);

      await DebugLogger.endPerformance(operationId, {
        success: true,
        filesFound: files.length,
        directory,
        extensionCount: extensions.length,
        excludePatternCount: allExcludePatterns.length,
      });

      await DebugLogger.info('File search completed', {
        filesFound: files.length,
        directory,
      });

      return files;
    } catch (error) {
      await DebugLogger.logError(error, {
        operation: 'findFiles',
        directory,
        extensions,
        component: 'FileOperations',
      });
      await DebugLogger.endPerformance(operationId, { success: false });

      throw new Error(`ファイル検索エラー: ${error.message}`);
    }
  }

  /**
   * ディレクトリを再帰的にスキャン（内部メソッド）
   * @private
   */
  static async scanDirectory(directory, fileList, extensions, excludePatterns) {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        const relativePath = path.relative(process.cwd(), fullPath);

        // 除外パターンチェック
        if (this.shouldExclude(relativePath, excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          // サブディレクトリを再帰的に検索
          await this.scanDirectory(fullPath, fileList, extensions, excludePatterns);
        } else if (entry.isFile()) {
          // 拡張子チェック
          if (this.matchesExtension(entry.name, extensions)) {
            // ファイルサイズチェック
            const stats = await fs.stat(fullPath);
            if (stats.size <= this.MAX_FILE_SIZE) {
              fileList.push(fullPath);
            }
          }
        }
      }
    } catch (error) {
      // アクセス権限がないディレクトリはスキップ
      await DebugLogger.warn('Cannot access directory - skipping', {
        directory,
        error: error.message,
        errorCode: error.code,
      });
    }
  }

  /**
   * 除外パターンチェック
   * @private
   */
  static shouldExclude(filePath, excludePatterns) {
    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const pattern of excludePatterns) {
      // 簡易的なパターンマッチング
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
        .replace(/\//g, '\\/');

      const regex = new RegExp(regexPattern);
      if (regex.test(normalizedPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 拡張子マッチング
   * @private
   */
  static matchesExtension(filename, extensions) {
    // 拡張子リストが空の場合は全ファイル対象
    if (!extensions || extensions.length === 0) {
      return true;
    }

    const fileExt = path.extname(filename).toLowerCase();
    return extensions.some(ext => {
      const targetExt = ext.toLowerCase();
      return fileExt === targetExt || fileExt === `.${targetExt}`;
    });
  }

  /**
   * ファイル内容読み込み
   * @param {string} filePath - ファイルパス
   * @returns {Promise<string>} ファイル内容
   */
  static async readFileContent(filePath) {
    const operationId = 'file-read-content';
    DebugLogger.startPerformance(operationId);

    try {
      await DebugLogger.debug('Reading file content', { filePath });

      // ファイルアクセス権限チェック
      await this.checkFilePermissions(filePath, 'read');

      // ファイルサイズチェック
      const stats = await fs.stat(filePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new Error(
          `ファイルサイズが上限(${this.MAX_FILE_SIZE / 1024 / 1024}MB)を超えています`
        );
      }

      await DebugLogger.debug('File size validated', {
        filePath,
        fileSize: stats.size,
        maxSize: this.MAX_FILE_SIZE,
      });

      // ファイル読み込み
      const content = await fs.readFile(filePath, 'utf8');

      await DebugLogger.endPerformance(operationId, {
        success: true,
        filePath,
        fileSize: stats.size,
        contentLength: content.length,
      });

      return content;
    } catch (error) {
      await DebugLogger.logError(error, {
        operation: 'readFileContent',
        filePath,
        component: 'FileOperations',
      });
      await DebugLogger.endPerformance(operationId, { success: false });

      throw new Error(`ファイル読み込みエラー: ${error.message}`);
    }
  }

  /**
   * ファイル内容書き込み
   * @param {string} filePath - ファイルパス
   * @param {string} content - 書き込む内容
   * @returns {Promise<void>}
   */
  static async writeFileContent(filePath, content) {
    const operationId = 'file-write-content';
    DebugLogger.startPerformance(operationId);

    try {
      await DebugLogger.debug('Writing file content', {
        filePath,
        contentLength: content.length,
      });

      // ファイルアクセス権限チェック
      await this.checkFilePermissions(filePath, 'write');

      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      await DebugLogger.debug('Directory ensured', { directory: dir });

      // ファイル書き込み
      await fs.writeFile(filePath, content, 'utf8');

      await DebugLogger.endPerformance(operationId, {
        success: true,
        filePath,
        contentSize: content.length,
      });

      await DebugLogger.info('File written successfully', {
        filePath,
        contentSize: content.length,
      });
    } catch (error) {
      await DebugLogger.logError(error, {
        operation: 'writeFileContent',
        filePath,
        contentLength: content.length,
        component: 'FileOperations',
      });
      await DebugLogger.endPerformance(operationId, { success: false });

      throw new Error(`ファイル書き込みエラー: ${error.message}`);
    }
  }

  /**
   * ファイルアクセス権限チェック
   * @param {string} filePath - ファイルパス
   * @param {string} mode - 'read' または 'write'
   * @returns {Promise<boolean>} アクセス可能かどうか
   */
  static async checkFilePermissions(filePath, mode = 'read') {
    try {
      // ファイルが存在しない場合
      try {
        await fs.access(filePath, fs.constants.F_OK);
      } catch {
        if (mode === 'write') {
          // 書き込みモードの場合、親ディレクトリの書き込み権限をチェック
          const dir = path.dirname(filePath);
          await fs.access(dir, fs.constants.W_OK);
          return true;
        }
        throw new Error('ファイルが存在しません');
      }

      // アクセス権限チェック
      const accessMode = mode === 'write' ? fs.constants.W_OK : fs.constants.R_OK;

      await fs.access(filePath, accessMode);

      return true;
    } catch (error) {
      if (error.code === 'EACCES') {
        throw new Error(
          `ファイルへの${mode === 'write' ? '書き込み' : '読み取り'}権限がありません`
        );
      }
      throw error;
    }
  }

  /**
   * ファイル統計情報取得
   * @param {string} filePath - ファイルパス
   * @returns {Promise<Object>} ファイル統計情報
   */
  static async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);

      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        permissions: {
          readable: await this.checkFilePermissions(filePath, 'read').catch(() => false),
          writable: await this.checkFilePermissions(filePath, 'write').catch(() => false),
        },
      };
    } catch (error) {
      throw new Error(`ファイル情報取得エラー: ${error.message}`);
    }
  }

  /**
   * 一時ファイル作成
   * @param {string} prefix - ファイル名プレフィックス
   * @param {string} content - ファイル内容
   * @returns {Promise<string>} 一時ファイルパス
   */
  static async createTempFile(prefix, content) {
    const tempDir = require('os').tmpdir();
    const timestamp = Date.now();
    const randomId = Math.random()
      .toString(this.RANDOM_ID_RADIX)
      .substring(this.RANDOM_ID_START_INDEX, this.RANDOM_ID_END_INDEX);
    const tempFilePath = path.join(tempDir, `${prefix}_${timestamp}_${randomId}.tmp`);

    await this.writeFileContent(tempFilePath, content);

    return tempFilePath;
  }

  /**
   * ファイルコピー
   * @param {string} sourcePath - コピー元
   * @param {string} destPath - コピー先
   * @returns {Promise<void>}
   */
  static async copyFile(sourcePath, destPath) {
    const startTime = performance.now();

    try {
      console.log(`📋 Copying file: ${sourcePath} → ${destPath}`);

      // コピー元の存在確認
      await fs.access(sourcePath);

      // コピー先ディレクトリ作成
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });

      // ファイルコピー
      await fs.copyFile(sourcePath, destPath);

      const copyTime = performance.now() - startTime;
      this.logOperation(
        'copyFile',
        { sourcePath, destPath },
        {
          success: true,
          copyTime: `${copyTime.toFixed(2)}ms`,
        }
      );
    } catch (error) {
      const copyTime = performance.now() - startTime;
      this.logOperation(
        'copyFile',
        { sourcePath, destPath },
        {
          success: false,
          error: error.message,
          copyTime: `${copyTime.toFixed(2)}ms`,
        }
      );

      throw new Error(`ファイルコピーエラー: ${error.message}`);
    }
  }
}

module.exports = FileOperations;
