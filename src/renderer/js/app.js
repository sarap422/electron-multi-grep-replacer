/**
 * Multi Grep Replacer - Renderer Process
 * UIロジック・IPC通信・パフォーマンス監視
 */

class MultiGrepReplacerUI {
  // UI制御基本定数
  static RESPONSE_TARGET_MS = 100; // ms
  static FILE_DISPLAY_LIMIT = 10; // 表示するファイル数上限
  static FILE_LIST_PREVIEW_COUNT = 20; // ファイルリスト表示件数

  // UI制御定数
  static UI_RESPONSE_TARGET = MultiGrepReplacerUI.RESPONSE_TARGET_MS; // ms
  static MAX_DISPLAY_FILES = MultiGrepReplacerUI.FILE_DISPLAY_LIMIT; // 表示するファイル数上限
  static KB_DIVISOR = 1024; // KB変換用
  static SIZE_DECIMAL_PLACES = 2; // サイズ表示小数点桁数
  static FILE_LIST_ITEM_COUNT = MultiGrepReplacerUI.FILE_LIST_PREVIEW_COUNT; // ファイルリスト表示件数

  constructor() {
    this.responseTimeTarget = MultiGrepReplacerUI.UI_RESPONSE_TARGET;
    this.startTime = performance.now();

    console.log('🖥️ Renderer process initializing...');
    this.initialize();
  }

  /**
   * UI初期化
   */
  async initialize() {
    // DOM読み込み完了確認
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupUI());
    } else {
      this.setupUI();
    }
  }

  /**
   * UI設定
   */
  setupUI() {
    console.log('🎨 Setting up UI...');

    // イベントリスナー設定
    this.setupEventListeners();

    // パフォーマンス監視開始
    this.initializePerformanceMonitoring();

    // ElectronAPI利用可能性確認
    this.verifyElectronAPI();

    // 初期化完了
    this.updateStatus('Ready', '⚡');
    console.log('✅ UI initialization completed');
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // Ping テストボタン
    const pingButton = document.getElementById('pingButton');
    if (pingButton) {
      pingButton.addEventListener('click', () => this.handlePingTest());
    }

    // アプリ情報ボタン
    const infoButton = document.getElementById('infoButton');
    if (infoButton) {
      infoButton.addEventListener('click', () => this.handleAppInfo());
    }

    // バージョン情報ボタン
    const versionButton = document.getElementById('versionButton');
    if (versionButton) {
      versionButton.addEventListener('click', () => this.handleVersionInfo());
    }

    // 設定管理テストボタン
    const configLoadButton = document.getElementById('configLoadButton');
    if (configLoadButton) {
      configLoadButton.addEventListener('click', () => this.handleConfigLoad());
    }

    const configSaveButton = document.getElementById('configSaveButton');
    if (configSaveButton) {
      configSaveButton.addEventListener('click', () => this.handleConfigSave());
    }

    const configRecentButton = document.getElementById('configRecentButton');
    if (configRecentButton) {
      configRecentButton.addEventListener('click', () => this.handleConfigRecent());
    }

    // ファイル操作テストボタン
    const folderSelectButton = document.getElementById('folderSelectButton');
    if (folderSelectButton) {
      folderSelectButton.addEventListener('click', () => this.handleFolderSelect());
    }

    const fileSearchButton = document.getElementById('fileSearchButton');
    if (fileSearchButton) {
      fileSearchButton.addEventListener('click', () => this.handleFileSearch());
    }

    const fileReadButton = document.getElementById('fileReadButton');
    if (fileReadButton) {
      fileReadButton.addEventListener('click', () => this.handleFileRead());
    }

    // 新しいファイル検索エンジンテストボタン
    const newFileSearchButton = document.getElementById('newFileSearchButton');
    if (newFileSearchButton) {
      newFileSearchButton.addEventListener('click', () => this.handleNewFileSearch());
    }

    const cancelSearchButton = document.getElementById('cancelSearchButton');
    if (cancelSearchButton) {
      cancelSearchButton.addEventListener('click', () => this.handleCancelSearch());
    }

    const searchStatsButton = document.getElementById('searchStatsButton');
    if (searchStatsButton) {
      searchStatsButton.addEventListener('click', () => this.handleSearchStats());
    }

    // 置換エンジンのイベントリスナー設定
    const replacementProcessButton = document.getElementById('replacementProcessButton');
    if (replacementProcessButton) {
      replacementProcessButton.addEventListener('click', () => this.handleReplacementProcess());
    }

    const replacementPreviewButton = document.getElementById('replacementPreviewButton');
    if (replacementPreviewButton) {
      replacementPreviewButton.addEventListener('click', () => this.handleReplacementPreview());
    }

    const cancelReplacementButton = document.getElementById('cancelReplacementButton');
    if (cancelReplacementButton) {
      cancelReplacementButton.addEventListener('click', () => this.handleCancelReplacement());
    }

    const replacementStatsButton = document.getElementById('replacementStatsButton');
    if (replacementStatsButton) {
      replacementStatsButton.addEventListener('click', () => this.handleReplacementStats());
    }

    const addRuleButton = document.getElementById('addRuleButton');
    if (addRuleButton) {
      addRuleButton.addEventListener('click', () => this.handleAddRule());
    }

    // 置換エンジンのイベントリスナー設定
    this.setupReplacementEventListeners();

    console.log('👂 Event listeners attached');
  }

  /**
   * Ping テスト実行
   */
  async handlePingTest() {
    const startTime = performance.now();

    try {
      this.updateStatus('Testing IPC...', '📡');

      // ElectronAPI経由でIPC通信
      const result = await window.electronAPI.ping();

      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      // 結果表示
      const resultText = `✅ IPC通信成功!

応答時間: ${responseTime.toFixed(2)}ms
結果: ${JSON.stringify(result, null, 2)}
目標値: ${this.responseTimeTarget}ms以内
評価: ${this.getPerformanceRating(responseTime)}`;

      this.displayResult('pingResult', resultText);
      this.updateStatus('Ready', '⚡');

      console.log(`📡 Ping test completed in ${responseTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ Ping test failed:', error);
      this.displayResult('pingResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * アプリ情報取得
   */
  async handleAppInfo() {
    const startTime = performance.now();

    try {
      this.updateStatus('Getting app info...', 'ℹ️');

      const info = await window.electronAPI.getAppInfo();
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      const resultText = `💻 アプリケーション情報

プラットフォーム: ${info.platform}
アーキテクチャ: ${info.arch}
プロセスID: ${info.pid}

メモリ使用量:
- RSS: ${(info.memory.rss / 1024 / 1024).toFixed(2)} MB
- Heap使用: ${(info.memory.heapUsed / 1024 / 1024).toFixed(2)} MB
- Heap総量: ${(info.memory.heapTotal / 1024 / 1024).toFixed(2)} MB
- 外部: ${(info.memory.external / 1024 / 1024).toFixed(2)} MB

応答時間: ${responseTime.toFixed(2)}ms`;

      this.displayResult('infoResult', resultText);
      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ App info failed:', error);
      this.displayResult('infoResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * バージョン情報取得
   */
  async handleVersionInfo() {
    const startTime = performance.now();

    try {
      this.updateStatus('Getting version info...', '📋');
      console.log('🔍 Starting version info request...');

      // 基本的な確認
      if (!window.electronAPI) {
        throw new Error('electronAPI is not available');
      }

      if (!window.electronAPI.getVersion) {
        throw new Error('getVersion method is not available');
      }

      console.log('📋 Requesting version info via IPC...');
      const version = await window.electronAPI.getVersion();
      console.log('📋 Version data received:', version);

      // バージョン情報の安全な表示
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      // 安全な文字列構築
      const appName = version?.name || 'Unknown';
      const appVersion = version?.version || 'Unknown';
      const electronVersion = version?.electron || 'Unknown';
      const nodeVersion = version?.node || 'Unknown';
      const chromeVersion = version?.chrome || 'Unknown';

      const resultText = `📋 バージョン情報

アプリケーション: ${appName} v${appVersion}
Electron: ${electronVersion}
Node.js: ${nodeVersion}
Chrome: ${chromeVersion}

応答時間: ${responseTime.toFixed(2)}ms`;

      this.displayResult('versionResult', resultText);
      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Version info failed:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      this.displayResult('versionResult', `❌ エラー: ${errorMessage}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 結果表示
   */
  displayResult(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text;
      element.classList.add('fade-in');
    }
  }

  /**
   * ステータス更新
   */
  updateStatus(text, icon) {
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');

    if (statusText) {
      statusText.textContent = text;
    }
    if (statusIndicator) {
      statusIndicator.textContent = icon;
    }
  }

  /**
   * 応答時間更新
   */
  updateResponseTime(responseTime) {
    const element = document.getElementById('responseTime');
    if (element) {
      element.textContent = `${responseTime.toFixed(2)}ms`;

      // パフォーマンス監視
      const monitor = document.getElementById('performanceMonitor');
      if (monitor) {
        monitor.className = `performance-monitor ${this.getPerformanceClass(responseTime)}`;
      }
    }
  }

  /**
   * パフォーマンス評価
   */
  getPerformanceRating(responseTime) {
    if (responseTime <= this.responseTimeTarget) {
      return '🟢 優秀 (目標値以内)';
    } else if (responseTime <= this.responseTimeTarget * 2) {
      return '🟡 注意 (目標値の2倍以内)';
    } else {
      return '🔴 警告 (目標値を大幅に超過)';
    }
  }

  /**
   * パフォーマンスCSSクラス
   */
  getPerformanceClass(responseTime) {
    if (responseTime <= this.responseTimeTarget) {
      return 'response-fast';
    } else if (responseTime <= this.responseTimeTarget * 2) {
      return 'response-medium';
    } else {
      return 'response-slow';
    }
  }

  /**
   * ElectronAPI利用可能性確認
   */
  verifyElectronAPI() {
    if (typeof window.electronAPI === 'undefined') {
      console.error('❌ ElectronAPI not available');
      this.updateStatus('ElectronAPI Error', '🚨');

      // エラーメッセージ表示
      const errorMsg = '❌ ElectronAPIが利用できません。preload.jsの設定を確認してください。';
      document.querySelectorAll('.test-result').forEach(el => {
        el.textContent = errorMsg;
      });

      return false;
    }

    console.log('✅ ElectronAPI available');
    return true;
  }

  /**
   * パフォーマンス監視初期化
   */
  initializePerformanceMonitoring() {
    // ボタンクリック応答性監視
    document.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', event => {
        const actionName = button.textContent.trim();
        this.monitorButtonResponse(event, actionName);
      });
    });

    console.log('📊 Performance monitoring initialized');
  }

  /**
   * ボタン応答性監視
   */
  monitorButtonResponse(event, actionName) {
    const startTime = performance.now();

    // 次のフレームで測定
    requestAnimationFrame(() => {
      const responseTime = performance.now() - startTime;

      if (responseTime > this.responseTimeTarget) {
        console.warn(`⚠️ UI応答性低下: ${actionName} (${responseTime.toFixed(2)}ms)`);
      } else {
        console.log(`✅ UI応答性良好: ${actionName} (${responseTime.toFixed(2)}ms)`);
      }
    });
  }

  /**
   * 設定読み込みテスト
   */
  async handleConfigLoad() {
    const startTime = performance.now();

    try {
      this.updateStatus('Loading config...', '📖');

      const result = await window.electronAPI.getDefaultConfig();
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const resultText = `✅ 設定読み込み成功!

応答時間: ${responseTime.toFixed(2)}ms
設定内容:
- アプリ名: ${result.config.app_info.name}
- バージョン: ${result.config.app_info.version}
- 置換ルール数: ${result.config.replacements.length}
- 対象拡張子: ${result.config.target_settings.file_extensions.join(', ')}

${JSON.stringify(result.config, null, 2)}`;

        this.displayResult('configResult', resultText);
      } else {
        this.displayResult('configResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Config load test failed:', error);
      this.displayResult('configResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 設定保存テスト
   */
  async handleConfigSave() {
    const startTime = performance.now();

    try {
      this.updateStatus('Saving config...', '💾');

      // テスト用設定作成
      const testConfig = {
        app_info: {
          name: 'Test Configuration',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          description: 'Test config created by UI',
          author: 'Test User',
        },
        replacements: [
          {
            id: 'test_rule_1',
            from: 'test-old',
            to: 'test-new',
            enabled: true,
            description: 'Test replacement rule',
          },
        ],
        target_settings: {
          file_extensions: ['.html', '.css', '.js'],
          exclude_patterns: ['node_modules/**', '.git/**'],
          include_subdirectories: true,
          max_file_size: 104857600,
          encoding: 'utf-8',
        },
        replacement_settings: {
          case_sensitive: true,
          use_regex: false,
          backup_enabled: false,
        },
        ui_settings: {
          theme: 'auto',
          window: { width: 800, height: 700 },
        },
        advanced_settings: {
          max_concurrent_files: 10,
          ui_response_target: 100,
        },
      };

      // プラットフォーム非依存の一時ファイルパス作成
      // メインプロセス側で適切な一時ディレクトリを解決
      const tempPath = `multi-grep-replacer-test-${Date.now()}.json`;

      const result = await window.electronAPI.saveConfig(testConfig, tempPath);
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const resultText = `✅ 設定保存成功!

応答時間: ${responseTime.toFixed(2)}ms
保存先: ${tempPath}
設定内容: Test Configuration
テストルール: test-old → test-new`;

        this.displayResult('configResult', resultText);
      } else {
        this.displayResult('configResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Config save test failed:', error);
      this.displayResult('configResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 最近の設定確認テスト
   */
  async handleConfigRecent() {
    const startTime = performance.now();

    try {
      this.updateStatus('Getting recent configs...', '📚');

      const result = await window.electronAPI.getRecentConfigs();
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const resultText = `✅ 最近の設定取得成功!

応答時間: ${responseTime.toFixed(2)}ms
設定ファイル数: ${result.configs.length}

${
  result.configs.length > 0
    ? result.configs
        .map((config, index) => `${index + 1}. ${config.name} (${config.lastUsed})`)
        .join('\n')
    : '最近使用した設定ファイルはありません'
}

詳細:
${JSON.stringify(result.configs, null, 2)}`;

        this.displayResult('configResult', resultText);
      } else {
        this.displayResult('configResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Recent configs test failed:', error);
      this.displayResult('configResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * フォルダ選択テスト
   */
  async handleFolderSelect() {
    const startTime = performance.now();

    try {
      this.updateStatus('Opening folder dialog...', '📂');

      const result = await window.electronAPI.selectFolder();
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const resultText = `✅ フォルダ選択成功!

応答時間: ${responseTime.toFixed(2)}ms
選択されたフォルダ: ${result.folderPath || 'キャンセルされました'}`;

        this.displayResult('fileResult', resultText);

        // 選択されたフォルダがある場合は次のテストボタンを有効化
        if (result.folderPath) {
          this.selectedFolder = result.folderPath;
        }
      } else {
        this.displayResult('fileResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Folder select test failed:', error);
      this.displayResult('fileResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * ファイル検索テスト
   */
  async handleFileSearch() {
    const startTime = performance.now();

    try {
      this.updateStatus('Searching files...', '🔍');

      // テスト用のディレクトリ（選択フォルダがない場合はユーザーに選択を促す）
      if (!this.selectedFolder) {
        await this.handleFolderSelect();
        if (!this.selectedFolder) {
          throw new Error('フォルダが選択されていません');
        }
      }
      const testDirectory = this.selectedFolder;
      const testExtensions = ['.js', '.html', '.css', '.md'];
      const testExcludePatterns = ['node_modules/**', 'dist/**'];

      const result = await window.electronAPI.findFiles(
        testDirectory,
        testExtensions,
        testExcludePatterns
      );
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const { files } = result;
        const resultText = `✅ ファイル検索成功!

応答時間: ${responseTime.toFixed(2)}ms
検索ディレクトリ: ${testDirectory}
対象拡張子: ${testExtensions.join(', ')}
見つかったファイル数: ${files.length}

上位${MultiGrepReplacerUI.MAX_DISPLAY_FILES}ファイル:
${files
  .slice(0, MultiGrepReplacerUI.MAX_DISPLAY_FILES)
  .map(
    (file, index) =>
      `${index + 1}. ${file.name} (${(file.size / MultiGrepReplacerUI.KB_DIVISOR).toFixed(
        MultiGrepReplacerUI.SIZE_DECIMAL_PLACES
      )} KB)`
  )
  .join('\n')}

${
  files.length > MultiGrepReplacerUI.MAX_DISPLAY_FILES
    ? `... 他 ${files.length - MultiGrepReplacerUI.MAX_DISPLAY_FILES} ファイル`
    : ''
}`;

        this.displayResult('fileResult', resultText);

        // 最初のファイルを次のテスト用に保存
        if (files.length > 0) {
          this.selectedFile = files[0].path;
        }
      } else {
        this.displayResult('fileResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ File search test failed:', error);
      this.displayResult('fileResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * ファイル読み込みテスト
   */
  async handleFileRead() {
    const startTime = performance.now();

    try {
      this.updateStatus('Reading file...', '📄');

      // テスト用ファイル（選択ファイルがない場合はデフォルトの設定ファイルを使用）
      const testFilePath = this.selectedFile || 'config/default.json';

      const result = await window.electronAPI.readFile(testFilePath);
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const { content } = result;
        const lines = content.split('\n').length;
        const size = content.length;

        const resultText = `✅ ファイル読み込み成功!

応答時間: ${responseTime.toFixed(2)}ms
ファイルパス: ${testFilePath}
ファイルサイズ: ${size} 文字
行数: ${lines}

内容プレビュー（最初の${MultiGrepReplacerUI.FILE_LIST_ITEM_COUNT}行）:
${content.split('\n').slice(0, MultiGrepReplacerUI.FILE_LIST_ITEM_COUNT).join('\n')}

${
  lines > MultiGrepReplacerUI.FILE_LIST_ITEM_COUNT
    ? `... 他 ${lines - MultiGrepReplacerUI.FILE_LIST_ITEM_COUNT} 行`
    : ''
}`;

        this.displayResult('fileResult', resultText);
      } else {
        this.displayResult('fileResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ File read test failed:', error);
      this.displayResult('fileResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 新しいファイル検索エンジンテスト
   */
  async handleNewFileSearch() {
    const startTime = performance.now();

    try {
      console.log('🚀 Starting new file search...');
      this.updateStatus('Searching with new engine...', '🚀');

      // セキュリティチェック: process オブジェクトが利用できないことを確認
      if (typeof process !== 'undefined') {
        console.warn('⚠️ process object detected in renderer - this should not happen');
      }

      // テスト用のディレクトリ（選択フォルダがない場合はユーザーに選択を促す）
      if (!this.selectedFolder) {
        await this.handleFolderSelect();
        if (!this.selectedFolder) {
          throw new Error('フォルダが選択されていません');
        }
      }
      const testDirectory = this.selectedFolder;
      const testExtensions = ['.js', '.html', '.css', '.md'];
      const testOptions = {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxConcurrency: 10,
      };

      // 進捗監視の設定
      window.electronAPI.onSearchProgress(progressData => {
        console.log('🚀 Search progress:', progressData);
        this.updateStatus(
          `Searching... ${progressData.filesFound} files found, ${progressData.directoriesScanned} directories scanned`,
          '🔍'
        );
      });

      const result = await window.electronAPI.searchFiles(
        testDirectory,
        testExtensions,
        testOptions
      );
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      // 進捗監視を停止
      window.electronAPI.removeSearchProgressListener();

      if (result.success) {
        const { files, stats } = result.result;
        const resultText = `✅ 新エンジンでのファイル検索成功!

応答時間: ${responseTime.toFixed(2)}ms
検索ディレクトリ: ${testDirectory}
対象拡張子: ${testExtensions.join(', ')}

検索結果:
- 見つかったファイル数: ${files.length}
- スキャンしたディレクトリ数: ${stats.totalDirectories}
- スキップしたファイル数: ${stats.skippedFiles}
- エラー数: ${stats.errors.length}

パフォーマンス:
- ファイル/秒: ${Math.round((files.length / responseTime) * 1000)}
- 処理速度評価: ${this.getPerformanceRating(responseTime)}

上位${MultiGrepReplacerUI.MAX_DISPLAY_FILES}ファイル:
${files
  .slice(0, MultiGrepReplacerUI.MAX_DISPLAY_FILES)
  .map(
    (file, index) =>
      `${index + 1}. ${file.name} (${(file.size / MultiGrepReplacerUI.KB_DIVISOR).toFixed(
        MultiGrepReplacerUI.SIZE_DECIMAL_PLACES
      )} KB)`
  )
  .join('\n')}

${
  files.length > MultiGrepReplacerUI.MAX_DISPLAY_FILES
    ? `... 他 ${files.length - MultiGrepReplacerUI.MAX_DISPLAY_FILES} ファイル`
    : ''
}

${
  stats.errors.length > 0
    ? `\nエラー:\n${stats.errors
        .slice(0, 3)
        .map(e => `- ${e.path}: ${e.error}`)
        .join('\n')}`
    : ''
}`;

        this.displayResult('newSearchResult', resultText);

        // 最初のファイルを保存
        if (files.length > 0) {
          this.selectedFile = files[0].path;
        }

        // 置換テスト用にファイルパス配列を保存
        this.lastSearchFiles = files.map(f => f.path);
        this.displayResult(
          'replacementResult',
          `✅ ${this.lastSearchFiles.length}個のファイルが見つかりました。置換テストが可能です。`
        );
      } else {
        this.displayResult('newSearchResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ New file search test failed:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      });

      // 詳細なエラー情報を表示
      let errorMessage = error.message;
      if (error.message.includes('process is not defined')) {
        errorMessage +=
          '\n\n解決方法: Electronのセキュリティ設定により、レンダラープロセスでは process オブジェクトを使用できません。';
      }

      this.displayResult('newSearchResult', `❌ エラー: ${errorMessage}`);
      this.updateStatus('Error', '🚨');

      // 進捗監視を停止
      try {
        window.electronAPI.removeSearchProgressListener();
      } catch (cleanupError) {
        console.warn('Failed to cleanup search progress listener:', cleanupError);
      }
    }
  }

  /**
   * 検索キャンセルテスト
   */
  async handleCancelSearch() {
    try {
      this.updateStatus('Cancelling search...', '🛑');

      const result = await window.electronAPI.cancelSearch();

      if (result.success) {
        this.displayResult('newSearchResult', '🛑 検索がキャンセルされました');
        this.updateStatus('Search cancelled', '🛑');
      } else {
        this.displayResult('newSearchResult', `❌ キャンセル失敗: ${result.error}`);
        this.updateStatus('Error', '🚨');
      }
    } catch (error) {
      console.error('❌ Cancel search failed:', error);
      this.displayResult('newSearchResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 検索統計情報取得テスト
   */
  async handleSearchStats() {
    const startTime = performance.now();

    try {
      this.updateStatus('Getting search stats...', '📈');

      const result = await window.electronAPI.getSearchStats();
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const { stats } = result;
        const resultText = `📈 検索統計情報

応答時間: ${responseTime.toFixed(2)}ms

統計情報:
- 総ファイル数: ${stats.totalFiles}
- 総ディレクトリ数: ${stats.totalDirectories}
- スキップしたファイル数: ${stats.skippedFiles}
- エラー数: ${stats.errors.length}

詳細:
${JSON.stringify(stats, null, 2)}`;

        this.displayResult('newSearchResult', resultText);
      } else {
        this.displayResult('newSearchResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Search stats failed:', error);
      this.displayResult('newSearchResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 置換エンジンのイベントリスナー設定
   */
  setupReplacementEventListeners() {
    // 進捗通知リスナー
    window.electronAPI.onReplacementProgress(progressData => {
      this.updateReplacementProgress(progressData);
    });

    // 開始通知リスナー
    window.electronAPI.onReplacementStart(startData => {
      this.updateStatus('置換処理中...', '🔄');
      this.displayResult('replacementResult', `🚀 置換処理開始: ${startData.totalFiles}ファイル`);
    });

    // 完了通知リスナー
    window.electronAPI.onReplacementComplete(completeData => {
      this.updateStatus('Ready', '⚡');
      const { stats } = completeData;
      const resultText = `✅ 置換処理完了!
      
総ファイル数: ${stats.totalFiles}
変更されたファイル数: ${stats.modifiedFiles}
総置換回数: ${stats.totalReplacements}
処理時間: ${completeData.duration}ms`;

      this.displayResult('replacementResult', resultText);
    });

    // エラー通知リスナー
    window.electronAPI.onReplacementError(errorData => {
      this.updateStatus('Error', '🚨');
      this.displayResult('replacementResult', `❌ 置換エラー: ${errorData.error}`);
    });

    // テスト用ルール初期化
    this.replacementRules = [];
    this.lastSearchFiles = [];
  }

  /**
   * 置換処理実行テスト
   */
  async handleReplacementProcess() {
    const startTime = performance.now();

    try {
      this.updateStatus('置換処理中...', '🔄');

      // テスト用ファイルが必要なので、まず検索を実行
      if (this.lastSearchFiles.length === 0) {
        this.displayResult('replacementResult', '⚠️ 先にファイル検索を実行してください');
        return;
      }

      // テスト用ルールが無い場合、デフォルトルールを追加
      if (this.replacementRules.length === 0) {
        this.replacementRules = [
          { from: 'test', to: 'TEST', enabled: true, id: 'rule1' },
          { from: 'example', to: 'EXAMPLE', enabled: true, id: 'rule2' },
        ];
      }

      const testOptions = {
        caseSensitive: true,
        dryRun: false,
      };

      const result = await window.electronAPI.processFiles(
        this.lastSearchFiles.slice(0, 5), // 最初の5ファイルのみ
        this.replacementRules,
        testOptions
      );

      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const resultText = `✅ 置換処理成功!

応答時間: ${responseTime.toFixed(2)}ms

統計情報:
- 処理ファイル数: ${result.stats.processedFiles}
- 変更ファイル数: ${result.stats.modifiedFiles}
- 総置換回数: ${result.stats.totalReplacements}
- エラー数: ${result.stats.errors.length}

詳細結果:
${result.results
  .slice(0, 3)
  .map(r => `- ${r.path}: ${r.replacements}回置換`)
  .join('\n')}`;

        this.displayResult('replacementResult', resultText);
      } else {
        this.displayResult('replacementResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Replacement processing failed:', error);
      this.displayResult('replacementResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 置換プレビュー生成テスト
   */
  async handleReplacementPreview() {
    const startTime = performance.now();

    try {
      this.updateStatus('プレビュー生成中...', '👀');

      if (this.lastSearchFiles.length === 0) {
        this.displayResult('replacementResult', '⚠️ 先にファイル検索を実行してください');
        return;
      }

      if (this.replacementRules.length === 0) {
        this.replacementRules = [{ from: 'test', to: 'TEST', enabled: true, id: 'rule1' }];
      }

      const result = await window.electronAPI.generatePreview(
        this.lastSearchFiles.slice(0, 3),
        this.replacementRules,
        5
      );

      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const { preview } = result;
        let resultText = `👀 置換プレビュー生成完了!

応答時間: ${responseTime.toFixed(2)}ms
プレビュー件数: ${preview.length}件

`;

        preview.forEach((item, index) => {
          resultText += `\n${index + 1}. ${item.path}`;
          item.changes.forEach(change => {
            resultText += `\n   ${change.rule} (${change.totalCount}箇所)`;
            change.matches.slice(0, 2).forEach(match => {
              resultText += `\n   L${match.line}: ${match.context}`;
            });
          });
        });

        this.displayResult('replacementResult', resultText);
      } else {
        this.displayResult('replacementResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Replacement preview failed:', error);
      this.displayResult('replacementResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 置換処理キャンセルテスト
   */
  async handleCancelReplacement() {
    try {
      this.updateStatus('キャンセル中...', '🛑');

      const result = await window.electronAPI.cancelReplacement();

      if (result.success) {
        this.displayResult('replacementResult', '🛑 置換処理がキャンセルされました');
        this.updateStatus('Ready', '⚡');
      } else {
        this.displayResult('replacementResult', `❌ キャンセル失敗: ${result.error}`);
        this.updateStatus('Error', '🚨');
      }
    } catch (error) {
      console.error('❌ Cancel replacement failed:', error);
      this.displayResult('replacementResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 置換統計情報取得テスト
   */
  async handleReplacementStats() {
    const startTime = performance.now();

    try {
      this.updateStatus('統計情報取得中...', '📊');

      const result = await window.electronAPI.getReplacementStats();
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const { stats } = result;
        const resultText = `📊 置換統計情報

応答時間: ${responseTime.toFixed(2)}ms

統計情報:
- 総ファイル数: ${stats.totalFiles}
- 処理済みファイル数: ${stats.processedFiles}
- 変更ファイル数: ${stats.modifiedFiles}
- 総置換回数: ${stats.totalReplacements}
- エラー数: ${stats.errors.length}

詳細:
${JSON.stringify(stats, null, 2)}`;

        this.displayResult('replacementResult', resultText);
      } else {
        this.displayResult('replacementResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Replacement stats failed:', error);
      this.displayResult('replacementResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 置換ルール追加
   */
  handleAddRule() {
    const fromText = document.getElementById('fromText').value.trim();
    const toText = document.getElementById('toText').value.trim();

    if (!fromText || !toText) {
      this.displayResult('replacementResult', '⚠️ From と To の両方を入力してください');
      return;
    }

    const newRule = {
      id: `rule_${Date.now()}`,
      from: fromText,
      to: toText,
      enabled: true,
    };

    this.replacementRules.push(newRule);
    this.updateRulesList();

    // 入力フィールドをクリア
    document.getElementById('fromText').value = '';
    document.getElementById('toText').value = '';

    this.displayResult('replacementResult', `✅ ルール追加: "${fromText}" → "${toText}"`);
  }

  /**
   * ルール一覧を更新
   */
  updateRulesList() {
    const rulesList = document.getElementById('rulesList');
    if (!rulesList) {
      return;
    }

    rulesList.innerHTML = '';

    this.replacementRules.forEach((rule, index) => {
      const ruleElement = document.createElement('div');
      ruleElement.className = 'rule-item';
      ruleElement.innerHTML = `
        <span class="rule-text">${rule.from} → ${rule.to}</span>
        <button class="remove-rule-btn" data-index="${index}">🗑️</button>
      `;

      const removeBtn = ruleElement.querySelector('.remove-rule-btn');
      removeBtn.addEventListener('click', () => {
        this.replacementRules.splice(index, 1);
        this.updateRulesList();
        this.displayResult('replacementResult', `🗑️ ルール削除: "${rule.from}" → "${rule.to}"`);
      });

      rulesList.appendChild(ruleElement);
    });
  }

  /**
   * 置換進捗更新
   */
  updateReplacementProgress(progressData) {
    const progressText = `🔄 処理中: ${progressData.processedFiles}/${progressData.totalFiles} (${progressData.percentage}%)`;
    this.updateStatus(progressText, '🔄');

    // プログレスバーの実装は将来の拡張で
    console.log('置換進捗:', progressData);
  }
}

// DOM読み込み完了後にアプリケーション開始
const app = new MultiGrepReplacerUI();
console.log('🚀 Multi Grep Replacer UI initialized:', app);
