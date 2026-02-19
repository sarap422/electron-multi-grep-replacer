/**
 * Multi Grep Replacer - Single Instance Test
 * シングルインスタンス制御のテストとデバッグ機能
 */

// eslint-disable-next-line no-unused-vars
const { app, BrowserWindow } = require('electron');
const DebugLogger = require('./debug-logger');

class SingleInstanceTest {
  // 定数定義（ESLintのno-magic-numbers対応）
  // eslint-disable-next-line no-magic-numbers
  static NANOSECONDS_TO_MILLISECONDS = 1e6;
  static WARNING_THRESHOLD_MS = 10;

  /**
   * シングルインスタンス制御のテスト実行
   */
  static async testSingleInstanceControl() {
    const testId = 'single-instance-test';
    await DebugLogger.info('Starting single instance control test', { testId });

    const results = {
      lockAcquired: false,
      lockTiming: 0,
      secondInstanceHandled: false,
      windowRestored: false,
      errors: [],
      warnings: [],
      timestamp: new Date().toISOString(),
    };

    // タイミング測定開始
    const startTime = process.hrtime.bigint();

    try {
      // シングルインスタンスロック取得テスト
      const gotTheLock = app.requestSingleInstanceLock();
      results.lockTiming =
        Number(process.hrtime.bigint() - startTime) / this.NANOSECONDS_TO_MILLISECONDS; // ms
      results.lockAcquired = gotTheLock;

      await DebugLogger.debug('Single instance lock acquisition', {
        gotTheLock,
        timing: `${results.lockTiming.toFixed(2)}ms`,
      });

      if (!gotTheLock) {
        results.errors.push('Failed to acquire single instance lock');
        await DebugLogger.warn('Single instance lock failed - another instance is running');
        return results;
      }

      // タイミングチェック
      if (results.lockTiming > this.WARNING_THRESHOLD_MS) {
        results.warnings.push(
          `Lock acquisition took ${results.lockTiming.toFixed(2)}ms (should be < ${
            this.WARNING_THRESHOLD_MS
          }ms)`
        );
      }

      // second-instanceイベントハンドラーの存在確認
      const hasSecondInstanceHandler = app.listenerCount('second-instance') > 0;
      if (!hasSecondInstanceHandler) {
        results.warnings.push('No second-instance event handler registered');
      }

      await DebugLogger.info('Single instance test completed', { results });
      return results;
    } catch (error) {
      results.errors.push(error.message);
      await DebugLogger.logError(error, {
        operation: 'single-instance-test',
        results,
      });
      return results;
    }
  }

  /**
   * シングルインスタンス実装の検証
   */
  static validateImplementation(mainJsPath) {
    const fs = require('fs');
    const issues = [];
    const recommendations = [];

    try {
      const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
      const lines = mainJsContent.split('\n');

      // 実装位置のチェック
      let lockLineIndex = -1;
      let appReadyLineIndex = -1;
      let initializeLineIndex = -1;

      lines.forEach((line, index) => {
        if (line.includes('requestSingleInstanceLock')) {
          lockLineIndex = index;
        }
        if (line.includes('app.whenReady') || line.includes("app.on('ready'")) {
          appReadyLineIndex = index;
        }
        if (
          (line.includes('initialize()') && line.includes('function')) ||
          line.includes('initialize() {')
        ) {
          initializeLineIndex = index;
        }
      });

      // タイミングチェック
      if (lockLineIndex > appReadyLineIndex && appReadyLineIndex !== -1) {
        issues.push({
          type: 'TIMING_ERROR',
          message: 'requestSingleInstanceLock() is called after app.whenReady()',
          line: lockLineIndex + 1,
          severity: 'critical',
        });
        recommendations.push('Move requestSingleInstanceLock() before app.whenReady()');
      }

      if (initializeLineIndex !== -1 && lockLineIndex > initializeLineIndex) {
        issues.push({
          type: 'STRUCTURE_WARNING',
          message: 'requestSingleInstanceLock() is inside or after initialize() method',
          line: lockLineIndex + 1,
          severity: 'high',
        });
        recommendations.push('Call requestSingleInstanceLock() at the top level of main.js');
      }

      // second-instanceハンドラーチェック
      if (!mainJsContent.includes('second-instance')) {
        issues.push({
          type: 'MISSING_HANDLER',
          message: 'Missing second-instance event handler',
          severity: 'critical',
        });
        recommendations.push("Add app.on('second-instance', ...) handler");
      }

      // ウィンドウ復元ロジックチェック
      const hasWindowRestore =
        mainJsContent.includes('restore()') && mainJsContent.includes('focus()');
      if (!hasWindowRestore) {
        issues.push({
          type: 'INCOMPLETE_HANDLER',
          message: 'Missing window restore/focus logic in second-instance handler',
          severity: 'medium',
        });
        recommendations.push(
          'Add mainWindow.restore() and mainWindow.focus() in second-instance handler'
        );
      }

      return {
        issues,
        recommendations,
        stats: {
          totalLines: lines.length,
          lockLine: lockLineIndex + 1,
          appReadyLine: appReadyLineIndex + 1,
        },
      };
    } catch (error) {
      return {
        issues: [
          {
            type: 'VALIDATION_ERROR',
            message: error.message,
            severity: 'critical',
          },
        ],
        recommendations: ['Fix file read error before validation'],
        stats: {},
      };
    }
  }

  /**
   * シングルインスタンス制御のデバッグ情報生成
   */
  static async generateDebugReport() {
    const report = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      tests: {},
      validation: {},
      recommendations: [],
    };

    // テスト実行
    report.tests = await this.testSingleInstanceControl();

    // 実装検証
    const mainJsPath = require('path').join(__dirname, 'main.js');
    report.validation = this.validateImplementation(mainJsPath);

    // 総合的な推奨事項
    if (report.tests.errors.length > 0) {
      report.recommendations.push('Fix critical errors in single instance control');
    }

    if (report.validation.issues.length > 0) {
      report.recommendations.push('Review and fix implementation issues');
    }

    if (report.tests.lockTiming > 10) {
      report.recommendations.push('Optimize lock acquisition timing');
    }

    // レポート保存
    const reportPath = require('path').join(
      __dirname,
      '..',
      '..',
      'debug',
      `single-instance-report-${Date.now()}.json`
    );

    try {
      const fs = require('fs').promises;
      await fs.mkdir(require('path').dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      await DebugLogger.info('Single instance debug report saved', { reportPath });
    } catch (error) {
      await DebugLogger.logError(error, {
        operation: 'save-debug-report',
        reportPath,
      });
    }

    return report;
  }

  /**
   * 推奨される実装パターンの生成
   */
  static getRecommendedPattern() {
    return `/**
 * Recommended Single Instance Control Pattern for Electron
 */

const { app, BrowserWindow } = require('electron');

// 1. 最初にシングルインスタンスロックを取得（最重要）
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 2. ロック取得失敗 = 別インスタンスが既に起動中
  console.log('Another instance is already running, quitting...');
  app.quit();
} else {
  // 3. ロック取得成功 = このインスタンスがメイン

  let mainWindow = null;

  // 4. 2番目のインスタンス起動を検出した時の処理
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('Second instance detected:', { commandLine, workingDirectory });
    
    // 既存のウィンドウがある場合は表示・フォーカス
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // 5. アプリケーション準備完了後の処理
  app.whenReady().then(() => {
    createMainWindow();
  });

  // 6. ウィンドウ作成関数
  function createMainWindow() {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js')
      }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  // 7. macOS用: すべてのウィンドウが閉じても終了しない
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // 8. macOS用: Dockアイコンクリック時の処理
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}`;
  }
}

module.exports = SingleInstanceTest;
