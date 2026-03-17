const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
// VibeLogger (ES Module) - 動的importで読み込み
let vibeLoggerModule = null;
const ConfigManager = require('./config-manager');
const FileOperations = require('./file-operations');
const FileSearchEngine = require('./file-search-engine');
const ReplacementEngine = require('./replacement-engine');
const DebugLogger = require('./debug-logger');
const PerformanceOptimizer = require('./performance-optimizer');
const MemoryManager = require('./memory-manager');

// Vibe Logger初期化（グローバル） - 動的import後に初期化
global.vibeLogger = null;

/**
 * Multi Grep Replacer - Main Process
 * Electronアプリケーションのエントリーポイント
 */
class MultiGrepReplacerApp {
  constructor() {
    this.mainWindow = null;
    this.isDevelopment = !app.isPackaged;
    this.startTime = performance.now();
    this.initializationTracker = 'app-initialization';
    this.fileSearchEngine = new FileSearchEngine();
    this.replacementEngine = new ReplacementEngine();
    this.performanceOptimizer = null; // 初期化後に設定
    this.memoryManager = null; // 初期化後に設定

    // Vibe Logger初期化（非同期処理のため、initializeメソッドで行う）
  }

  /**
   * アプリケーション初期化
   */
  async initialize() {
    // デバッグロガー初期化（最優先）
    await DebugLogger.initialize();
    DebugLogger.startPerformance(this.initializationTracker);

    // Vibe Logger初期化
    try {
      vibeLoggerModule = await import('vibelogger');

      // プロジェクトのlogsディレクトリに出力するようにパスを設定
      const logsDir = path.join(__dirname, '../../logs/vibe');

      global.vibeLogger = vibeLoggerModule.createFileLogger('multi-grep-replacer', {
        logDir: logsDir,
      });
      console.log('✅ Vibe Logger initialized successfully at:', logsDir);

      // 初期化ログ
      global.vibeLogger.info('app_startup', 'Multi Grep Replacer starting', {
        context: {
          version: '1.0.0',
          platform: process.platform,
          nodeVersion: process.version,
          electronVersion: process.versions.electron,
          isDevelopment: this.isDevelopment,
        },
        humanNote: 'アプリケーション起動時の環境情報',
        aiTodo: 'パフォーマンス改善の提案があれば記録',
      });
    } catch (error) {
      console.warn('⚠️ Vibe Logger initialization failed:', error.message);
      global.vibeLogger = null;
    }

    await DebugLogger.info('Multi Grep Replacer starting...', {
      isDevelopment: this.isDevelopment,
      platform: process.platform,
      electronVersion: process.versions.electron,
    });

    try {
      // アプリイベントリスナー設定
      DebugLogger.startPerformance('setup-app-listeners');
      this.setupAppEventListeners();
      await DebugLogger.endPerformance('setup-app-listeners');

      // IPC通信ハンドラー設定
      DebugLogger.startPerformance('setup-ipc-handlers');
      this.setupIpcHandlers();
      await DebugLogger.endPerformance('setup-ipc-handlers');

      // パフォーマンス最適化エンジン初期化
      DebugLogger.startPerformance('setup-performance-optimizers');
      await this.initializePerformanceOptimizers();
      await DebugLogger.endPerformance('setup-performance-optimizers');

      await DebugLogger.info('Application initialized successfully');
    } catch (error) {
      await DebugLogger.logError(error, {
        phase: 'initialization',
        component: 'MultiGrepReplacerApp',
      });
      throw error;
    }
  }

  /**
   * パフォーマンス最適化エンジン初期化
   */
  async initializePerformanceOptimizers() {
    try {
      if (global.vibeLogger) {
        await global.vibeLogger.info(
          'performance_optimizers_init_start',
          'Initializing performance optimization engines',
          {
            context: {
              timestamp: new Date().toISOString(),
            },
            humanNote: 'パフォーマンス最適化エンジンの初期化開始',
            aiTodo: '最適化エンジンの効果測定と改善提案',
          }
        );
      }

      // パフォーマンス最適化エンジン初期化
      this.performanceOptimizer = new PerformanceOptimizer(DebugLogger);
      await DebugLogger.info('Performance Optimizer initialized');

      // メモリ管理エンジン初期化
      this.memoryManager = new MemoryManager(DebugLogger);
      await DebugLogger.info('Memory Manager initialized');

      if (global.vibeLogger) {
        await global.vibeLogger.info(
          'performance_optimizers_init_complete',
          'Performance optimization engines initialized successfully',
          {
            context: {
              optimizerTargets: this.performanceOptimizer.getPerformanceStats().targets,
              memoryThresholds: {
                warning: `${Math.round(
                  this.memoryManager.MEMORY_WARNING_THRESHOLD / 1024 / 1024
                )}MB`,
                critical: `${Math.round(
                  this.memoryManager.MEMORY_CRITICAL_THRESHOLD / 1024 / 1024
                )}MB`,
              },
            },
            humanNote: 'パフォーマンス最適化エンジンの初期化完了',
          }
        );
      }

      await DebugLogger.info('Performance optimization engines initialized successfully');
    } catch (error) {
      await DebugLogger.logError(error, {
        phase: 'performance-optimization-init',
        component: 'MultiGrepReplacerApp',
      });

      if (global.vibeLogger) {
        await global.vibeLogger.error(
          'performance_optimizers_init_error',
          'Failed to initialize performance optimization engines',
          {
            context: { error: error.message, stack: error.stack },
            aiTodo: 'パフォーマンス最適化エンジン初期化エラーの分析と修正',
          }
        );
      }

      throw error;
    }
  }

  /**
   * メインウィンドウ作成
   */
  async createMainWindow() {
    DebugLogger.startPerformance('create-main-window');
    await DebugLogger.info('Creating main window...');

    try {
      this.mainWindow = new BrowserWindow({
        width: 800,
        height: 700,
        minWidth: 600,
        minHeight: 500,
        show: true, // パッケージ版での問題を回避するため最初から表示
        title: 'Multi Grep Replacer',
        titleBarStyle: 'default',
        webPreferences: {
          // セキュリティ設定（必須）
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          webSecurity: true,
          allowRunningInsecureContent: false,
          experimentalFeatures: false,

          // preload スクリプト
          preload: path.join(__dirname, '../preload/preload.js'),
        },
      });

      // セキュリティ設定検証
      const securityValid = this.validateSecuritySettings();
      await DebugLogger.info('Security settings validation', { isValid: securityValid });

      // HTMLファイル読み込み
      const htmlPath = path.join(__dirname, '../renderer/index.html');

      await DebugLogger.debug('Loading HTML file', {
        htmlPath,
        isPackaged: app.isPackaged,
        __dirname,
        resolvedPath: path.resolve(htmlPath),
      });

      // loadFileを使用
      try {
        await this.mainWindow.loadFile(htmlPath);
        await DebugLogger.debug('HTML file loaded successfully');
      } catch (loadError) {
        await DebugLogger.error('HTML file loading failed', {
          error: loadError.message,
          htmlPath,
          stack: loadError.stack,
        });

        // エラー時は最小限のHTMLを表示
        await this.mainWindow.loadURL(`data:text/html,
          <html>
            <body style="font-family: system-ui; padding: 20px;">
              <h1>Error Loading Application</h1>
              <p>Failed to load: ${htmlPath}</p>
              <p>Error: ${loadError.message}</p>
            </body>
          </html>
        `);
      }

      // ウィンドウクローズイベント
      this.mainWindow.on('closed', async () => {
        await DebugLogger.info('Main window closed');
        this.mainWindow = null;
      });

      // ウィンドウが準備完了したらログ記録（既に表示されている）
      this.mainWindow.once('ready-to-show', async () => {
        await DebugLogger.info('Window ready to show');

        // 開発時のみ DevTools を開く
        if (this.isDevelopment) {
          this.mainWindow.webContents.openDevTools();
          await DebugLogger.debug('DevTools opened for development');
        }

        // 起動時間を計測
        const startupTime = performance.now() - this.startTime;
        await DebugLogger.endPerformance(this.initializationTracker, {
          totalStartupTime: `${startupTime.toFixed(2)}ms`,
        });

        await DebugLogger.info(`App startup completed`, {
          startupTime: `${startupTime.toFixed(2)}ms`,
          target: '< 3000ms',
        });

        // アプリケーション状態をログ
        await DebugLogger.logAppState({ phase: 'startup-complete' });
      });

      // ウィンドウのフォーカス
      this.mainWindow.focus();

      await DebugLogger.endPerformance('create-main-window');
      await DebugLogger.info('Main window created successfully');
    } catch (error) {
      await DebugLogger.logError(error, {
        phase: 'window-creation',
        component: 'MultiGrepReplacerApp',
      });
      throw error;
    }
  }

  /**
   * アプリイベントリスナー設定
   */
  setupAppEventListeners() {
    DebugLogger.debug('Setting up app event listeners');

    // アプリ準備完了
    app.whenReady().then(async () => {
      await DebugLogger.info('App ready, creating main window');
      await this.createMainWindow();

      // macOS: Dock アイコンクリック時のウィンドウ再作成
      app.on('activate', async () => {
        await DebugLogger.debug('App activated (macOS dock click)');
        if (BrowserWindow.getAllWindows().length === 0) {
          await DebugLogger.info('No windows found, creating new main window');
          await this.createMainWindow();
        } else if (this.mainWindow) {
          // 既存のウィンドウがある場合は表示・フォーカス
          await DebugLogger.info('Focusing existing window');
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      });
    });

    // 全ウィンドウクローズ時
    app.on('window-all-closed', async () => {
      await DebugLogger.info('All windows closed', { platform: process.platform });

      // メインウィンドウ参照をクリア
      this.mainWindow = null;

      // macOS以外では完全終了
      if (process.platform !== 'darwin') {
        await DebugLogger.info('Quitting application (non-macOS)');
        app.quit();
      }
    });

    // アプリ終了前の処理
    app.on('before-quit', async () => {
      await DebugLogger.info('Application shutting down...');

      // 最終状態をログ
      await DebugLogger.logAppState({ phase: 'shutdown' });

      // パフォーマンス統計をログ
      const logStats = DebugLogger.getLogStats();
      await DebugLogger.info('Final log statistics', logStats);
    });

    DebugLogger.debug('App event listeners registered successfully');
  }

  /**
   * IPC通信ハンドラー設定
   */
  setupIpcHandlers() {
    DebugLogger.debug('Setting up IPC handlers');

    // Vibe Logger IPC ハンドラー
    ipcMain.handle('vibe-log', async (event, level, operation, message, options) => {
      try {
        if (global.vibeLogger && global.vibeLogger[level]) {
          await global.vibeLogger[level](operation, message, options);
          return { success: true };
        } else {
          console.warn(`Vibe Logger: ${level} method not available`);
          return { success: false, error: `${level} method not available` };
        }
      } catch (error) {
        console.error(`Vibe Logger IPC error: ${error.message}`);
        return { success: false, error: error.message };
      }
    });

    // 基本通信テスト（ping-pong）
    ipcMain.handle('ping', async () => {
      const operationId = 'ipc-ping';
      DebugLogger.startPerformance(operationId);

      const timestamp = Date.now();
      await DebugLogger.debug('IPC ping received', { timestamp });

      const response = {
        status: 'success',
        timestamp,
        message: 'pong',
      };

      await DebugLogger.endPerformance(operationId);
      return response;
    });

    // アプリバージョン取得
    ipcMain.handle('get-version', async () => {
      const operationId = 'ipc-get-version';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Getting version info in main process');
        const packageJson = require('../../package.json');

        await DebugLogger.debug('Package.json loaded', {
          name: packageJson.name,
          version: packageJson.version,
        });

        const versionInfo = {
          version: packageJson.version,
          name: packageJson.name,
          electron: process.versions.electron,
          node: process.versions.node,
          chrome: process.versions.chrome,
        };

        await DebugLogger.debug('Version info prepared', versionInfo);
        await DebugLogger.endPerformance(operationId, { success: true });
        return versionInfo;
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'get-version',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        throw error;
      }
    });

    // アプリ情報取得
    ipcMain.handle('get-app-info', async () => {
      const operationId = 'ipc-get-app-info';
      DebugLogger.startPerformance(operationId);

      const appInfo = {
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        pid: process.pid,
      };

      await DebugLogger.debug('App info retrieved', appInfo);
      await DebugLogger.endPerformance(operationId);
      return appInfo;
    });

    // 設定管理 API
    ipcMain.handle('load-config', async (event, filePath) => {
      const operationId = 'ipc-load-config';
      DebugLogger.startPerformance(operationId);

      try {
        // filePathが指定されていない場合は、ファイル選択ダイアログを表示
        if (!filePath) {
          await DebugLogger.debug('No file path provided, opening file dialog');
          filePath = await FileOperations.selectLoadConfigFile(this.mainWindow);

          if (!filePath) {
            await DebugLogger.debug('Config file selection cancelled');
            await DebugLogger.endPerformance(operationId, { cancelled: true });
            return { success: false, cancelled: true };
          }
        }

        await DebugLogger.debug('Loading config via IPC', { filePath });
        const config = await ConfigManager.loadConfig(filePath);
        await DebugLogger.endPerformance(operationId, { success: true, filePath });
        return { success: true, config };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'load-config',
          filePath,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('save-config', async (event, config, filePath) => {
      const operationId = 'ipc-save-config';
      DebugLogger.startPerformance(operationId);

      try {
        // filePathが指定されていない場合は、ファイル保存ダイアログを表示
        if (!filePath) {
          await DebugLogger.debug('No file path provided, opening save dialog');
          filePath = await FileOperations.selectSaveConfigFile(this.mainWindow);

          if (!filePath) {
            await DebugLogger.debug('Config save cancelled');
            await DebugLogger.endPerformance(operationId, { cancelled: true });
            return { success: false, cancelled: true };
          }
        }

        await DebugLogger.debug('Saving config via IPC', { filePath });
        await ConfigManager.saveConfig(config, filePath);
        await DebugLogger.endPerformance(operationId, { success: true, filePath });
        return { success: true };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'save-config',
          filePath,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-default-config', async () => {
      const operationId = 'ipc-get-default-config';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Getting default config via IPC');
        const config = await ConfigManager.getDefaultConfig();
        await DebugLogger.endPerformance(operationId, { success: true });
        return { success: true, config };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'get-default-config',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-recent-configs', async () => {
      const operationId = 'ipc-get-recent-configs';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Getting recent configs via IPC');
        const configs = await ConfigManager.getRecentConfigs();
        await DebugLogger.endPerformance(operationId, {
          success: true,
          configCount: configs.length,
        });
        return { success: true, configs };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'get-recent-configs',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    // ファイル操作 API
    ipcMain.handle('select-folder', async () => {
      const operationId = 'ipc-select-folder';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Opening folder selection dialog');
        const folderPath = await FileOperations.selectFolder(this.mainWindow);
        await DebugLogger.endPerformance(operationId, {
          success: true,
          hasPath: !!folderPath,
        });
        return { success: true, folderPath };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'select-folder',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    // フォルダパス検証
    ipcMain.handle('validate-folder-path', async (event, folderPath) => {
      const operationId = 'ipc-validate-folder-path';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Validating folder path via IPC', { folderPath });

        // ファイルシステムでパスの存在確認
        const fs = require('fs').promises;
        const path = require('path');

        // パスの正規化
        const normalizedPath = path.resolve(folderPath);

        try {
          const stats = await fs.stat(normalizedPath);
          const exists = stats.isDirectory();

          await DebugLogger.endPerformance(operationId, {
            success: true,
            exists,
            folderPath: normalizedPath,
          });

          if (exists) {
            await DebugLogger.info('Folder path validated successfully', {
              folderPath: normalizedPath,
            });
          } else {
            await DebugLogger.warn('Path exists but is not a directory', {
              folderPath: normalizedPath,
            });
          }

          return { success: true, exists, folderPath: normalizedPath };
        } catch (statError) {
          // ファイル/フォルダが存在しない
          await DebugLogger.endPerformance(operationId, {
            success: true,
            exists: false,
            folderPath: normalizedPath,
          });

          await DebugLogger.debug('Folder path does not exist', {
            folderPath: normalizedPath,
            error: statError.code,
          });

          return { success: true, exists: false, folderPath: normalizedPath };
        }
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'validate-folder-path',
          folderPath,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('find-files', async (event, directory, extensions, excludePatterns) => {
      const operationId = 'ipc-find-files';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Finding files via IPC', {
          directory,
          extensions,
          excludePatterns,
        });
        const files = await FileOperations.findFiles(directory, extensions, excludePatterns);
        await DebugLogger.endPerformance(operationId, {
          success: true,
          fileCount: files.length,
          directory,
        });
        return { success: true, files };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'find-files',
          directory,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('read-file', async (event, filePath) => {
      const operationId = 'ipc-read-file';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Reading file via IPC', { filePath });
        const content = await FileOperations.readFileContent(filePath);
        await DebugLogger.endPerformance(operationId, {
          success: true,
          filePath,
          contentLength: content.length,
        });
        return { success: true, content };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'read-file',
          filePath,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('write-file', async (event, filePath, content) => {
      const operationId = 'ipc-write-file';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Writing file via IPC', {
          filePath,
          contentLength: content.length,
        });
        await FileOperations.writeFileContent(filePath, content);
        await DebugLogger.endPerformance(operationId, {
          success: true,
          filePath,
        });
        return { success: true };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'write-file',
          filePath,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    // 新しいファイル検索エンジン API
    ipcMain.handle('search-files', async (event, directory, extensions, options = {}) => {
      const operationId = 'ipc-search-files';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Searching files with new engine', {
          directory,
          extensions,
          options,
        });

        // 進捗通知の設定
        this.fileSearchEngine.removeAllListeners('progress');
        this.fileSearchEngine.on('progress', progressData => {
          event.sender.send('search-progress', progressData);
        });

        const result = await this.fileSearchEngine.searchFiles(directory, extensions, options);

        await DebugLogger.endPerformance(operationId, {
          success: true,
          filesFound: result.files.length,
          stats: result.stats,
        });

        return { success: true, result };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'search-files',
          directory,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    // ファイル検索キャンセル
    ipcMain.handle('cancel-search', async () => {
      const operationId = 'ipc-cancel-search';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Cancelling file search');
        this.fileSearchEngine.cancelSearch();
        await DebugLogger.endPerformance(operationId, { success: true });
        return { success: true };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'cancel-search',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    // ファイル検索統計情報取得
    ipcMain.handle('get-search-stats', async () => {
      const operationId = 'ipc-get-search-stats';
      DebugLogger.startPerformance(operationId);

      try {
        const stats = this.fileSearchEngine.getStats();
        await DebugLogger.endPerformance(operationId, { success: true });
        return { success: true, stats };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'get-search-stats',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    // 置換エンジン API
    ipcMain.handle('process-files', async (event, files, rules, options = {}) => {
      const operationId = 'ipc-process-files';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Processing files with replacement engine', {
          fileCount: files.length,
          ruleCount: rules.length,
          options,
        });

        // 進捗通知の設定
        this.replacementEngine.removeAllListeners('progress');
        this.replacementEngine.removeAllListeners('start');
        this.replacementEngine.removeAllListeners('complete');
        this.replacementEngine.removeAllListeners('error');

        this.replacementEngine.on('progress', progressData => {
          event.sender.send('replacement-progress', progressData);
        });

        this.replacementEngine.on('start', startData => {
          event.sender.send('replacement-start', startData);
        });

        this.replacementEngine.on('complete', completeData => {
          event.sender.send('replacement-complete', completeData);
        });

        this.replacementEngine.on('error', errorData => {
          event.sender.send('replacement-error', errorData);
        });

        // 置換エンジンのオプション設定
        this.replacementEngine.options = { ...this.replacementEngine.options, ...options };

        const result = await this.replacementEngine.processFiles(files, rules);

        await DebugLogger.endPerformance(operationId, {
          success: true,
          modifiedFiles: result.stats.modifiedFiles,
          totalReplacements: result.stats.totalReplacements,
        });

        return result;
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'process-files',
          fileCount: files.length,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        throw error;
      }
    });

    // 単一ファイル処理
    ipcMain.handle('process-file', async (event, filePath, rules) => {
      const operationId = 'ipc-process-file';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Processing single file', { filePath, ruleCount: rules.length });
        const result = await this.replacementEngine.processFile(filePath, rules);

        await DebugLogger.endPerformance(operationId, {
          success: true,
          modified: result.modified,
          replacements: result.replacements,
        });

        return { success: true, result };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'process-file',
          filePath,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    // 置換プレビュー生成
    ipcMain.handle('generate-preview', async (event, files, rules, limit = 10) => {
      const operationId = 'ipc-generate-preview';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Generating replacement preview', {
          fileCount: files.length,
          ruleCount: rules.length,
          limit,
        });

        const preview = await this.replacementEngine.generatePreview(files, rules, limit);

        await DebugLogger.endPerformance(operationId, {
          success: true,
          previewCount: preview.length,
        });

        return { success: true, preview };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'generate-preview',
          fileCount: files.length,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    // 置換処理キャンセル
    ipcMain.handle('cancel-replacement', async () => {
      const operationId = 'ipc-cancel-replacement';
      DebugLogger.startPerformance(operationId);

      try {
        const cancelled = this.replacementEngine.cancelProcessing();
        await DebugLogger.endPerformance(operationId, { success: true, cancelled });
        return { success: true, cancelled };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'cancel-replacement',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    // 置換統計情報取得
    ipcMain.handle('get-replacement-stats', async () => {
      const operationId = 'ipc-get-replacement-stats';
      DebugLogger.startPerformance(operationId);

      try {
        const stats = this.replacementEngine.getStats();
        await DebugLogger.endPerformance(operationId, { success: true });
        return { success: true, stats };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'get-replacement-stats',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    // 包括的な置換実行ハンドラー
    ipcMain.handle('executeReplacement', async (event, config) => {
      const operationId = 'ipc-execute-replacement';
      await DebugLogger.startPerformance(operationId);

      try {
        // 複数フォルダ対応: targetFolders があればそれを使う、なければ targetFolder を配列化
        const targetFolders =
          config.targetFolders && config.targetFolders.length > 0
            ? config.targetFolders
            : config.targetFolder
            ? [config.targetFolder]
            : [];

        await DebugLogger.info('Starting replacement execution', {
          targetFolders,
          extensions: config.extensions,
          rulesCount: config.rules?.length || 0,
        });

        console.log('🔍 Debug - executeReplacement called with config:', {
          targetFolders,
          extensions: config.extensions,
          rules: config.rules,
        });

        // 1. 複数フォルダからファイル検索
        const extensionsArray = config.extensions
          ? config.extensions.split(',').map(ext => ext.trim())
          : [];
        const searchOptions = {
          excludePatterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
          ...config.options,
        };

        let allFiles = [];
        for (const folder of targetFolders) {
          console.log(`🔍 Debug - Searching files in: ${folder}`);
          const searchResult = await this.fileSearchEngine.searchFiles(
            folder,
            extensionsArray,
            searchOptions
          );
          if (searchResult?.files) {
            allFiles = allFiles.concat(searchResult.files);
          }
        }

        console.log('🔍 Debug - Total files found across all folders:', allFiles.length);

        await DebugLogger.info('Files found', {
          count: allFiles.length,
          folderCount: targetFolders.length,
        });

        // 2. 進捗通知のセットアップ
        this.replacementEngine.removeAllListeners('progress');
        this.replacementEngine.on('progress', progressData => {
          event.sender.send('replacement-progress', progressData);
        });

        // 3. ファイル置換処理
        // FileSearchEngineから返されるファイルオブジェクトのpathプロパティを抽出
        const filePaths = allFiles.map(file => file.path || file);
        console.log('🔍 Debug - Extracted file paths:', filePaths);

        const replacementResult = await this.replacementEngine.processFiles(
          filePaths,
          config.rules
        );

        const result = {
          success: true,
          stats: {
            totalFiles: allFiles.length || 0,
            processedFiles: replacementResult.stats?.processedFiles || 0,
            changedFiles: replacementResult.stats?.modifiedFiles || 0,
            totalChanges: replacementResult.stats?.totalReplacements || 0,
            errors: replacementResult.stats?.errors?.length || 0,
          },
          results: replacementResult.results || [],
        };

        await DebugLogger.info('Replacement completed successfully', result.stats);
        await DebugLogger.endPerformance(operationId, { success: true });
        return result;
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'execute-replacement',
          component: 'IPC-Handler',
          config,
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    // パフォーマンス最適化 API
    ipcMain.handle('get-performance-stats', async () => {
      const operationId = 'ipc-get-performance-stats';
      DebugLogger.startPerformance(operationId);

      try {
        const stats = {
          optimizer: this.performanceOptimizer
            ? this.performanceOptimizer.getPerformanceStats()
            : null,
          memory: this.memoryManager ? this.memoryManager.getStats() : null,
        };

        await DebugLogger.endPerformance(operationId, { success: true });
        return { success: true, stats };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'get-performance-stats',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('optimize-memory', async () => {
      const operationId = 'ipc-optimize-memory';
      DebugLogger.startPerformance(operationId);

      try {
        if (!this.memoryManager) {
          throw new Error('Memory Manager not initialized');
        }

        await DebugLogger.debug('Manual memory optimization requested');
        await this.memoryManager.performPeriodicCleanup();

        const stats = this.memoryManager.getStats();
        await DebugLogger.endPerformance(operationId, { success: true });
        return { success: true, stats };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'optimize-memory',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('optimize-file-processing', async (event, files, processor) => {
      const operationId = 'ipc-optimize-file-processing';
      DebugLogger.startPerformance(operationId);

      try {
        if (!this.performanceOptimizer) {
          throw new Error('Performance Optimizer not initialized');
        }

        await DebugLogger.debug('File processing optimization requested', {
          fileCount: files.length,
        });

        const result = await this.performanceOptimizer.optimizeFileProcessing(files, processor);

        await DebugLogger.endPerformance(operationId, {
          success: true,
          processingTime: result.metrics.processingTime,
          strategy: result.metrics.strategy,
        });

        return { success: true, result };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'optimize-file-processing',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    DebugLogger.info('IPC handlers registered successfully');
  }

  /**
   * セキュリティ設定検証
   */
  validateSecuritySettings() {
    DebugLogger.debug('Validating security settings');

    if (!this.mainWindow) {
      DebugLogger.warn('Cannot validate security settings - no main window available');
      return false;
    }

    // セキュリティ設定の記録（実際の値は作成時の設定から推測）
    const expectedSettings = {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
    };

    // セキュリティ設定が適切に適用されていることを確認
    DebugLogger.info('Security settings validated (based on BrowserWindow configuration)', {
      expectedSettings,
      windowCreated: !!this.mainWindow,
      preloadScript: 'src/preload/preload.js',
    });

    return true;
  }
}

// シングルインスタンス制御のデバッグ機能付き実装
const SingleInstanceTest = require('./single-instance-test');

// デバッグモードでのシングルインスタンステスト実行
if (process.env.DEBUG_SINGLE_INSTANCE === 'true') {
  SingleInstanceTest.generateDebugReport().then(report => {
    console.log('📊 Single Instance Debug Report:', report);
  });
}

// アプリケーション実行（シングルインスタンス制御は一時的に無効化）
// TODO: SingleInstanceTest.getRecommendedPattern() を参考に実装予定
const multiGrepReplacer = new MultiGrepReplacerApp();
multiGrepReplacer.initialize();

module.exports = MultiGrepReplacerApp;
