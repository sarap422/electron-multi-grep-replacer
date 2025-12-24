const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const DebugLogger = require('./debug-logger');

/**
 * Multi Grep Replacer - Configuration Manager
 * JSON設定ファイルの読み込み・保存・検証
 */
class ConfigManager {
  // 設定ファイルのスキーマバージョン
  static SCHEMA_VERSION = '1.0.0';

  // デフォルト設定ファイルパス（パッケージ版対応）
  static get DEFAULT_CONFIG_PATH() {
    if (app.isPackaged) {
      // パッケージ版: extraResourcesを使用
      return path.join(process.resourcesPath, 'config/default.json');
    } else {
      // 開発版: 従来のパス
      return path.join(__dirname, '../../config/default.json');
    }
  }

  // ユーザー設定ディレクトリ
  static USER_CONFIG_DIR = path.join(app.getPath('userData'), 'configs');

  // 最近使用した設定ファイルの履歴
  static RECENT_CONFIGS_PATH = path.join(app.getPath('userData'), 'recent-configs.json');

  // 定数値設定
  static MINIMUM_WIDTH_PX = 400;
  static MINIMUM_HEIGHT_PX = 300;
  static RECENT_CONFIG_LIMIT = 10;

  // UI設定の制限値
  static MIN_WINDOW_WIDTH = ConfigManager.MINIMUM_WIDTH_PX; // px
  static MIN_WINDOW_HEIGHT = ConfigManager.MINIMUM_HEIGHT_PX; // px
  static MAX_RECENT_CONFIGS = ConfigManager.RECENT_CONFIG_LIMIT; // 履歴保持数

  // DebugLogger統合ヘルパー
  static async logOperation(operation, data, result) {
    const level = result.success ? 'info' : 'error';
    await DebugLogger[level](`ConfigManager: ${operation}`, {
      component: 'ConfigManager',
      operation,
      ...data,
      ...result,
    });
  }

  /**
   * 設定ファイル読み込み
   * @param {string} filePath - 設定ファイルパス
   * @returns {Promise<Object>} 設定オブジェクト
   */
  static async loadConfig(filePath) {
    const operationId = 'config-load';
    DebugLogger.startPerformance(operationId);

    try {
      await DebugLogger.info('Loading config file', { filePath });

      // ファイル存在確認
      await fs.access(filePath);

      // ファイル読み込み
      const configContent = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(configContent);

      await DebugLogger.debug('Config file parsed', {
        filePath,
        configKeys: Object.keys(config),
        configSize: configContent.length,
      });

      // 設定検証
      const validationResult = this.validateConfig(config);
      if (!validationResult.valid) {
        throw new Error(`設定ファイル検証エラー: ${validationResult.errors.join(', ')}`);
      }

      await DebugLogger.debug('Config validation passed', {
        filePath,
        validationErrors: validationResult.errors.length,
      });

      await DebugLogger.endPerformance(operationId, {
        success: true,
        filePath,
        configKeys: Object.keys(config).length,
      });

      // 最近使用した設定に追加
      await this.addToRecentConfigs(filePath);

      return config;
    } catch (error) {
      await DebugLogger.logError(error, {
        operation: 'loadConfig',
        filePath,
        component: 'ConfigManager',
      });
      await DebugLogger.endPerformance(operationId, { success: false });

      throw new Error(`設定ファイル読み込みエラー: ${error.message}`);
    }
  }

  /**
   * 設定ファイル保存
   * @param {Object} config - 設定オブジェクト
   * @param {string} filePath - 保存先パス
   * @returns {Promise<void>}
   */
  static async saveConfig(config, filePath) {
    const startTime = performance.now();

    try {
      console.log(`💾 Saving config to: ${filePath}`);

      // 設定検証
      const validationResult = this.validateConfig(config);
      if (!validationResult.valid) {
        throw new Error(`設定検証エラー: ${validationResult.errors.join(', ')}`);
      }

      // 保存先ディレクトリ作成
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // 設定にメタデータ追加
      const configWithMeta = {
        ...config,
        app_info: {
          ...config.app_info,
          saved_at: new Date().toISOString(),
          schema_version: this.SCHEMA_VERSION,
        },
      };

      // JSON整形して保存
      const configJson = JSON.stringify(configWithMeta, null, 2);
      await fs.writeFile(filePath, configJson, 'utf8');

      const saveTime = performance.now() - startTime;
      this.logOperation(
        'saveConfig',
        { filePath },
        {
          success: true,
          saveTime: `${saveTime.toFixed(2)}ms`,
          fileSize: configJson.length,
        }
      );

      // 最近使用した設定に追加
      await this.addToRecentConfigs(filePath);
    } catch (error) {
      const saveTime = performance.now() - startTime;
      this.logOperation(
        'saveConfig',
        { filePath },
        {
          success: false,
          error: error.message,
          saveTime: `${saveTime.toFixed(2)}ms`,
        }
      );

      throw new Error(`設定ファイル保存エラー: ${error.message}`);
    }
  }

  /**
   * 設定検証
   * @param {Object} config - 検証する設定
   * @returns {Object} 検証結果 { valid: boolean, errors: string[] }
   */
  static validateConfig(config) {
    const errors = [];

    // 必須フィールドチェック
    if (!config) {
      errors.push('設定オブジェクトが空です');
      return { valid: false, errors };
    }

    // app_info検証
    if (!config.app_info || typeof config.app_info !== 'object') {
      errors.push('app_info セクションが必要です');
    }

    // replacements検証
    if (!Array.isArray(config.replacements)) {
      errors.push('replacements は配列である必要があります');
    } else {
      config.replacements.forEach((rule, index) => {
        if (!rule.from || typeof rule.from !== 'string') {
          errors.push(`置換ルール[${index}]: 'from' フィールドが必要です`);
        }
        if (!rule.to || typeof rule.to !== 'string') {
          errors.push(`置換ルール[${index}]: 'to' フィールドが必要です`);
        }
      });
    }

    // target_settings検証
    if (!config.target_settings || typeof config.target_settings !== 'object') {
      errors.push('target_settings セクションが必要です');
    } else {
      if (!Array.isArray(config.target_settings.file_extensions)) {
        errors.push('file_extensions は配列である必要があります');
      }
      if (typeof config.target_settings.max_file_size !== 'number') {
        errors.push('max_file_size は数値である必要があります');
      }
    }

    // ui_settings検証
    if (config.ui_settings) {
      if (config.ui_settings.window) {
        const { window } = config.ui_settings;
        if (typeof window.width !== 'number' || window.width < this.MIN_WINDOW_WIDTH) {
          errors.push(`ウィンドウ幅は${this.MIN_WINDOW_WIDTH}px以上必要です`);
        }
        if (typeof window.height !== 'number' || window.height < this.MIN_WINDOW_HEIGHT) {
          errors.push(`ウィンドウ高さは${this.MIN_WINDOW_HEIGHT}px以上必要です`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * デフォルト設定取得
   * @returns {Promise<Object>} デフォルト設定
   */
  static async getDefaultConfig() {
    try {
      const configPath = this.DEFAULT_CONFIG_PATH;
      console.log('🔧 Loading default configuration');
      console.log(`📁 Config path: ${configPath}`);
      console.log(`📦 Is packaged: ${app.isPackaged}`);
      console.log(`🗂️ Process resources path: ${process.resourcesPath || 'N/A'}`);

      // ファイル存在確認
      try {
        await fs.access(configPath);
        console.log(`✅ Config file exists: ${configPath}`);
      } catch (accessError) {
        console.log(`❌ Config file not found: ${configPath}`);
        console.log(`📂 Checking directory contents...`);

        const dir = path.dirname(configPath);
        try {
          const files = await fs.readdir(dir);
          console.log(`📁 Directory contents (${dir}):`, files);
        } catch (dirError) {
          console.log(`❌ Directory not accessible: ${dir}`, dirError.message);
        }
      }

      const config = await this.loadConfig(configPath);

      // カスタマイズ可能な初期値を設定
      config.app_info = {
        ...config.app_info,
        created_at: new Date().toISOString(),
        author: process.env.USER || 'User',
      };

      this.logOperation(
        'getDefaultConfig',
        {},
        {
          success: true,
          configLoaded: true,
        }
      );

      return config;
    } catch (error) {
      this.logOperation(
        'getDefaultConfig',
        {},
        {
          success: false,
          error: error.message,
        }
      );

      // デフォルト設定読み込み失敗時のフォールバック
      return this.getMinimalDefaultConfig();
    }
  }

  /**
   * 最小限のデフォルト設定（フォールバック用）
   * @returns {Object} 最小限の設定
   */
  static getMinimalDefaultConfig() {
    return {
      app_info: {
        name: 'Multi Grep Replacer',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        description: 'Multi Grep Replacer Configuration',
        author: process.env.USER || 'User',
      },
      replacements: [],
      target_settings: {
        file_extensions: ['.html', '.css', '.js', '.php', '.md', '.json'],
        exclude_patterns: ['node_modules/**', '.git/**', 'dist/**'],
        include_subdirectories: true,
        max_file_size: 104857600, // 100MB
        encoding: 'utf-8',
      },
      replacement_settings: {
        case_sensitive: true,
        use_regex: false,
        backup_enabled: false,
        preserve_file_permissions: true,
        dry_run: false,
      },
      ui_settings: {
        theme: 'auto',
        window: {
          width: 800,
          height: 700,
          resizable: true,
          center: true,
        },
        remember_last_folder: true,
        auto_save_config: false,
        show_file_count_preview: true,
        confirm_before_execution: true,
      },
      advanced_settings: {
        max_concurrent_files: 10,
        progress_update_interval: 100,
        log_level: 'info',
        enable_crash_reporting: false,
        ui_response_target: 100,
      },
    };
  }

  /**
   * 最近使用した設定を取得
   * @returns {Promise<Array>} 最近使用した設定のリスト
   */
  static async getRecentConfigs() {
    try {
      await fs.access(this.RECENT_CONFIGS_PATH);
      const content = await fs.readFile(this.RECENT_CONFIGS_PATH, 'utf8');
      const recentConfigs = JSON.parse(content);

      // 存在するファイルのみフィルタ
      const validConfigs = [];
      for (const config of recentConfigs) {
        try {
          await fs.access(config.path);
          validConfigs.push(config);
        } catch {
          // ファイルが存在しない場合はスキップ
        }
      }

      return validConfigs;
    } catch (error) {
      // 履歴ファイルがない場合は空配列を返す
      return [];
    }
  }

  /**
   * 最近使用した設定に追加
   * @param {string} filePath - 設定ファイルパス
   * @returns {Promise<void>}
   */
  static async addToRecentConfigs(filePath) {
    try {
      const recentConfigs = await this.getRecentConfigs();

      // 既存のエントリを削除
      const filteredConfigs = recentConfigs.filter(config => config.path !== filePath);

      // 新しいエントリを先頭に追加
      const newEntry = {
        path: filePath,
        name: path.basename(filePath, '.json'),
        lastUsed: new Date().toISOString(),
      };

      filteredConfigs.unshift(newEntry);

      // 最大件数まで保持
      const limitedConfigs = filteredConfigs.slice(0, this.MAX_RECENT_CONFIGS);

      // 保存
      await fs.mkdir(path.dirname(this.RECENT_CONFIGS_PATH), { recursive: true });
      await fs.writeFile(this.RECENT_CONFIGS_PATH, JSON.stringify(limitedConfigs, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to update recent configs:', error);
      // エラーは無視（重要な機能ではないため）
    }
  }

  /**
   * サンプル設定をユーザー設定ディレクトリにコピー
   * @returns {Promise<void>}
   */
  static async setupSampleConfigs() {
    try {
      const samplesDir = path.join(__dirname, '../../config/sample-configs');
      const userSamplesDir = path.join(this.USER_CONFIG_DIR, 'samples');

      await fs.mkdir(userSamplesDir, { recursive: true });

      const sampleFiles = await fs.readdir(samplesDir);

      for (const file of sampleFiles) {
        if (file.endsWith('.json')) {
          const sourcePath = path.join(samplesDir, file);
          const destPath = path.join(userSamplesDir, file);

          try {
            await fs.access(destPath);
            // ファイルが既に存在する場合はスキップ
          } catch {
            // ファイルが存在しない場合はコピー
            const content = await fs.readFile(sourcePath, 'utf8');
            await fs.writeFile(destPath, content, 'utf8');
            console.log(`📋 Sample config copied: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to setup sample configs:', error);
      // エラーは無視（重要な機能ではないため）
    }
  }
}

module.exports = ConfigManager;
