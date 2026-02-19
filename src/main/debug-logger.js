/**
 * Debug Logger - 統合ログシステム
 * Electron アプリケーション用の包括的なデバッグ・ログ機能
 */

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class DebugLogger {
  // ログレベル定義
  static LOG_LEVELS = {
    ERROR: 1, // アプリケーション停止を伴う重大エラー
    WARN: 2, // 処理継続可能だが注意が必要
    INFO: 3, // 重要な処理の開始・完了
    DEBUG: 4, // 詳細な処理状況（開発時のみ）
    TRACE: 5, // 非常に詳細な追跡情報
  };

  // ログレベル名
  static LOG_LEVEL_NAMES = ['', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];

  // ログレベル設定定数
  static DEV_LOG_LEVEL_NUMBER = 4; // DEBUG
  static PROD_LOG_LEVEL_NUMBER = 3; // INFO

  // ログレベル設定
  static DEFAULT_DEVELOPMENT_LEVEL = DebugLogger.DEV_LOG_LEVEL_NUMBER; // DEBUG
  static DEFAULT_PRODUCTION_LEVEL = DebugLogger.PROD_LOG_LEVEL_NUMBER; // INFO

  // 現在のログレベル（環境変数または開発/本番モードで決定）
  static currentLevel = (() => {
    const envLevel = process.env.LOG_LEVEL;
    if (envLevel && DebugLogger.LOG_LEVELS[envLevel.toUpperCase()]) {
      return DebugLogger.LOG_LEVELS[envLevel.toUpperCase()];
    }
    return process.env.NODE_ENV === 'development'
      ? DebugLogger.DEFAULT_DEVELOPMENT_LEVEL
      : DebugLogger.DEFAULT_PRODUCTION_LEVEL;
  })();

  // ログファイルパス
  static logDir = (() => {
    try {
      return path.join(app.getPath('userData'), 'logs');
    } catch (error) {
      // テスト環境ではappが利用できない場合
      return path.join(process.cwd(), 'debug', 'logs');
    }
  })();

  static logFilePath = path.join(DebugLogger.logDir, 'app.log');
  static errorLogPath = path.join(DebugLogger.logDir, 'error.log');
  static performanceLogPath = path.join(DebugLogger.logDir, 'performance.log');

  // ログローテーション設定定数
  static LOG_SIZE_MB_LIMIT = 10; // MB
  static LOG_FILE_COUNT_LIMIT = 5;

  // ログローテーション設定
  static MAX_LOG_SIZE_MB = DebugLogger.LOG_SIZE_MB_LIMIT; // MB
  static MAX_LOG_SIZE = DebugLogger.MAX_LOG_SIZE_MB * 1024 * 1024; // bytes
  static MAX_LOG_FILES = DebugLogger.LOG_FILE_COUNT_LIMIT;

  // パフォーマンス監視用
  static performanceMetrics = new Map();
  static memoryMetrics = [];

  // パフォーマンス監視設定定数
  static MEMORY_WARNING_MB = 200; // MB
  static MONITORING_INTERVAL_MS = 30000; // 30秒
  static MEMORY_METRICS_LIMIT = 100; // 保持するメトリクス数

  // パフォーマンス監視設定
  static MEMORY_WARNING_THRESHOLD_MB = DebugLogger.MEMORY_WARNING_MB; // MB
  static MEMORY_WARNING_THRESHOLD = DebugLogger.MEMORY_WARNING_THRESHOLD_MB * 1024 * 1024; // bytes
  static MEMORY_MONITORING_INTERVAL = DebugLogger.MONITORING_INTERVAL_MS; // 30秒
  static MAX_MEMORY_METRICS = DebugLogger.MEMORY_METRICS_LIMIT; // 保持するメトリクス数

  /**
   * ログディレクトリ初期化
   */
  static async initialize() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
      console.log(`📁 Log directory initialized: ${this.logDir}`);

      // 起動時ログ
      this.info('Debug Logger initialized', {
        logLevel: this.LOG_LEVEL_NAMES[this.currentLevel],
        logDir: this.logDir,
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
      });

      // パフォーマンス監視開始
      this.startPerformanceMonitoring();
    } catch (error) {
      console.error('❌ Failed to initialize log directory:', error);
    }
  }

  /**
   * メインログ記録関数
   */
  static async log(level, message, context = {}, options = {}) {
    if (level > this.currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const caller = this.getCaller(options.skipFrames || 2);

    const logEntry = {
      timestamp,
      level: this.LOG_LEVEL_NAMES[level],
      message,
      caller: {
        file: caller.file,
        function: caller.function,
        line: caller.line,
      },
      context,
      process: {
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
    };

    // コンソール出力（色付き）
    this.outputToConsole(logEntry);

    // ファイル出力
    await this.writeToFile(logEntry);

    // エラーレベルの場合は専用ログにも記録
    if (level === this.LOG_LEVELS.ERROR) {
      await this.writeToErrorLog(logEntry);
    }
  }

  /**
   * ログレベル別の便利関数
   */
  static async error(message, context = {}, options = {}) {
    await this.log(this.LOG_LEVELS.ERROR, message, context, options);
  }

  static async warn(message, context = {}, options = {}) {
    await this.log(this.LOG_LEVELS.WARN, message, context, options);
  }

  static async info(message, context = {}, options = {}) {
    await this.log(this.LOG_LEVELS.INFO, message, context, options);
  }

  static async debug(message, context = {}, options = {}) {
    await this.log(this.LOG_LEVELS.DEBUG, message, context, options);
  }

  static async trace(message, context = {}, options = {}) {
    await this.log(this.LOG_LEVELS.TRACE, message, context, options);
  }

  /**
   * パフォーマンス測定開始
   */
  static startPerformance(operationName) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    this.performanceMetrics.set(operationName, {
      startTime,
      startMemory,
      timestamp: new Date().toISOString(),
    });

    this.debug(`Performance tracking started: ${operationName}`, {
      operation: operationName,
      startMemory,
    });

    return operationName;
  }

  /**
   * パフォーマンス測定終了
   */
  static async endPerformance(operationName, additionalContext = {}) {
    const metrics = this.performanceMetrics.get(operationName);
    if (!metrics) {
      this.warn(`Performance tracking not found: ${operationName}`);
      return null;
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - metrics.startTime;

    const performanceData = {
      operation: operationName,
      duration: Math.round(duration * 100) / 100, // ms、小数点2桁
      memory: {
        start: metrics.startMemory,
        end: endMemory,
        delta: {
          rss: endMemory.rss - metrics.startMemory.rss,
          heapUsed: endMemory.heapUsed - metrics.startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - metrics.startMemory.heapTotal,
          external: endMemory.external - metrics.startMemory.external,
        },
      },
      timestamp: {
        start: metrics.timestamp,
        end: new Date().toISOString(),
      },
      ...additionalContext,
    };

    // パフォーマンス警告チェック
    if (duration > 1000) {
      // 1秒以上
      this.warn(
        `Performance warning: ${operationName} took ${duration.toFixed(2)}ms`,
        performanceData
      );
    } else {
      this.debug(`Performance completed: ${operationName}`, performanceData);
    }

    // パフォーマンスログファイルに記録
    await this.writeToPerformanceLog(performanceData);

    this.performanceMetrics.delete(operationName);
    return performanceData;
  }

  /**
   * パフォーマンス測定の実行時間取得
   */
  static getPerformance(operationName) {
    const metrics = this.performanceMetrics.get(operationName);
    if (!metrics) {
      this.warn(`Performance tracking not found: ${operationName}`);
      return 0;
    }

    const currentTime = performance.now();
    const duration = currentTime - metrics.startTime;
    return Math.round(duration * 100) / 100; // ms、小数点2桁
  }

  /**
   * UI応答性監視（レンダラープロセス用）
   */
  static async logUIResponse(actionName, responseTime, target = 100) {
    const isSlowResponse = responseTime > target;
    const level = isSlowResponse ? this.LOG_LEVELS.WARN : this.LOG_LEVELS.DEBUG;

    await this.log(level, `UI Response: ${actionName}`, {
      action: actionName,
      responseTime: Math.round(responseTime * 100) / 100,
      target,
      status: isSlowResponse ? 'SLOW' : 'GOOD',
      ratio: Math.round((responseTime / target) * 100) / 100,
    });
  }

  /**
   * エラーとスタックトレースの詳細ログ
   */
  static async logError(error, context = {}) {
    const errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      syscall: error.syscall,
      path: error.path,
      ...context,
    };

    await this.error('Exception occurred', errorDetails);
  }

  /**
   * アプリケーション状態のスナップショット
   */
  static async logAppState(context = {}) {
    const appState = {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      ...context,
    };

    await this.info('Application state snapshot', appState);
    return appState;
  }

  /**
   * 呼び出し元の情報を取得
   */
  static getCaller(skipFrames = 2) {
    const { stack } = new Error();
    const lines = stack.split('\n');

    if (lines.length > skipFrames) {
      const callerLine = lines[skipFrames];
      const match =
        callerLine.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/) ||
        callerLine.match(/at\s+(.+):(\d+):(\d+)/);

      if (match) {
        return {
          function: match[1] || 'anonymous',
          file: path.basename(match[2] || match[1] || 'unknown'),
          line: parseInt(match[3] || match[2] || '0', 10),
          column: parseInt(match[4] || match[3] || '0', 10),
        };
      }
    }

    return {
      function: 'unknown',
      file: 'unknown',
      line: 0,
      column: 0,
    };
  }

  /**
   * コンソール出力（色付き）
   */
  static outputToConsole(logEntry) {
    const colors = {
      ERROR: '\x1b[31m', // 赤
      WARN: '\x1b[33m', // 黄
      INFO: '\x1b[36m', // シアン
      DEBUG: '\x1b[37m', // 白
      TRACE: '\x1b[90m', // グレー
    };

    const reset = '\x1b[0m';
    const color = colors[logEntry.level] || '';

    const contextStr =
      Object.keys(logEntry.context).length > 0
        ? `\n  Context: ${JSON.stringify(logEntry.context, null, 2)}`
        : '';

    console.log(
      `${color}[${logEntry.timestamp}] ${logEntry.level} ${logEntry.caller.file}:${logEntry.caller.line}${reset}\n` +
        `  ${logEntry.message}${contextStr}`
    );
  }

  /**
   * メインログファイルに書き込み
   */
  static async writeToFile(logEntry) {
    try {
      // 開発環境でのみファイル書き込みを実行
      if (process.env.NODE_ENV === 'development' && this.logFilePath) {
        const logLine = `${JSON.stringify(logEntry)}\n`;
        await fs.appendFile(this.logFilePath, logLine);

        // ログローテーション確認
        await this.rotateLogIfNeeded(this.logFilePath);
      }
    } catch (error) {
      // ファイル書き込みエラーは無視（コンソール出力は継続）
      // console.error('Failed to write to log file:', error);
    }
  }

  /**
   * エラー専用ログファイルに書き込み
   */
  static async writeToErrorLog(logEntry) {
    try {
      // 開発環境でのみファイル書き込みを実行
      if (process.env.NODE_ENV === 'development' && this.errorLogPath) {
        const logLine = `${JSON.stringify(logEntry)}\n`;
        await fs.appendFile(this.errorLogPath, logLine);

        // ログローテーション確認
        await this.rotateLogIfNeeded(this.errorLogPath);
      }
    } catch (error) {
      // ファイル書き込みエラーは無視（コンソール出力は継続）
      // console.error('Failed to write to error log file:', error);
    }
  }

  /**
   * パフォーマンスログファイルに書き込み
   */
  static async writeToPerformanceLog(performanceData) {
    try {
      const logLine = `${JSON.stringify(performanceData)}\n`;
      await fs.appendFile(this.performanceLogPath, logLine);

      // ログローテーション確認
      await this.rotateLogIfNeeded(this.performanceLogPath);
    } catch (error) {
      console.error('Failed to write to performance log file:', error);
    }
  }

  /**
   * ログローテーション
   */
  static async rotateLogIfNeeded(logPath) {
    try {
      const stats = await fs.stat(logPath);
      if (stats.size > this.MAX_LOG_SIZE) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = `${logPath}.${timestamp}`;

        await fs.rename(logPath, rotatedPath);
        this.info('Log file rotated', { originalPath: logPath, rotatedPath });

        // 古いログファイルを削除
        await this.cleanOldLogs(path.dirname(logPath), path.basename(logPath));
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * 古いログファイルの削除
   */
  static async cleanOldLogs(logDir, baseFileName) {
    try {
      const files = await fs.readdir(logDir);
      const logFiles = files
        .filter(file => file.startsWith(`${baseFileName}.`))
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          time: file.split('.').pop(),
        }))
        .sort((a, b) => b.time.localeCompare(a.time));

      // MAX_LOG_FILES以上のファイルを削除
      if (logFiles.length > this.MAX_LOG_FILES) {
        const filesToDelete = logFiles.slice(this.MAX_LOG_FILES);
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          this.debug('Old log file deleted', { path: file.path });
        }
      }
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }

  /**
   * パフォーマンス監視の開始
   */
  static startPerformanceMonitoring() {
    // メモリ使用量の定期監視
    setInterval(() => {
      const memory = process.memoryUsage();
      this.memoryMetrics.push({
        timestamp: new Date().toISOString(),
        ...memory,
      });

      // メモリ使用量警告
      if (memory.heapUsed > this.MEMORY_WARNING_THRESHOLD) {
        this.warn('High memory usage detected', {
          heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
          rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
          threshold: `${this.MEMORY_WARNING_THRESHOLD_MB}MB`,
        });
      }

      // 古いメモリメトリクスを削除
      if (this.memoryMetrics.length > this.MAX_MEMORY_METRICS) {
        this.memoryMetrics.shift();
      }
    }, this.MEMORY_MONITORING_INTERVAL);

    this.debug('Performance monitoring started', {
      interval: '30 seconds',
      memoryThreshold: '200MB',
    });
  }

  /**
   * ログ統計の取得
   */
  static getLogStats() {
    return {
      currentLevel: this.LOG_LEVEL_NAMES[this.currentLevel],
      logDir: this.logDir,
      performanceMetrics: Array.from(this.performanceMetrics.keys()),
      memoryMetrics: this.memoryMetrics.length,
      uptime: process.uptime(),
    };
  }
}

module.exports = DebugLogger;
