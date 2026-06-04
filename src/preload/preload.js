/**
 * Multi Grep Replacer - Preload Script
 * セキュアなIPC API公開
 */

const { contextBridge, ipcRenderer } = require('electron');

console.log('🔧 Preload script loading...');

/**
 * セキュアなElectron APIをレンダラープロセスに公開
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 基本IPC通信テスト
   * @returns {Promise<Object>} ping結果
   */
  ping: async () => {
    console.log('📡 Sending ping...');
    try {
      const result = await ipcRenderer.invoke('ping');
      console.log('📡 Ping response:', result);
      return result;
    } catch (error) {
      console.error('❌ Ping failed:', error);
      throw error;
    }
  },

  /**
   * アプリケーションバージョン情報取得
   * @returns {Promise<Object>} バージョン情報
   */
  getVersion: async () => {
    console.log('📋 Getting version info...');
    try {
      const result = await ipcRenderer.invoke('get-version');
      console.log('📋 Version info:', result);
      return result;
    } catch (error) {
      console.error('❌ Version info failed:', error);
      throw error;
    }
  },

  /**
   * アプリケーション情報取得
   * @returns {Promise<Object>} アプリ情報
   */
  getAppInfo: async () => {
    console.log('ℹ️ Getting app info...');
    try {
      const result = await ipcRenderer.invoke('get-app-info');
      console.log('ℹ️ App info:', result);
      return result;
    } catch (error) {
      console.error('❌ App info failed:', error);
      throw error;
    }
  },

  /**
   * ログ出力（デバッグ用）
   * @param {string} level - ログレベル
   * @param {string} message - メッセージ
   * @param {Object} context - コンテキスト
   */
  log: (level, message, context = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      source: 'renderer',
    };
    console.log(`[${level.toUpperCase()}] ${message}`, context);
    console.log('📝 Log entry:', logEntry);

    // 将来の拡張: メインプロセスにログ送信
    // ipcRenderer.send('log', logEntry);
  },

  /**
   * パフォーマンス測定
   * @param {string} action - アクション名
   * @param {number} duration - 実行時間（ms）
   */
  reportPerformance: (action, duration) => {
    const performanceData = {
      action,
      duration,
      timestamp: Date.now(),
      memory: performance.memory
        ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
          }
        : null,
    };

    console.log(`📊 Performance: ${action} took ${duration.toFixed(2)}ms`);
    console.log('📊 Performance data:', performanceData);

    // 将来の拡張: パフォーマンスデータ送信
    // ipcRenderer.send('performance-data', performanceData);
  },

  // 設定管理 API
  /**
   * 設定ファイル読み込み
   * @param {string} [filePath] - 設定ファイルパス（省略時はダイアログ表示）
   * @returns {Promise<Object>} 設定オブジェクト
   */
  loadConfig: async (filePath = null) => {
    console.log('📖 Loading config via IPC:', filePath);
    try {
      const result = await ipcRenderer.invoke('load-config', filePath);
      console.log('📖 Config load result:', result);
      return result;
    } catch (error) {
      console.error('❌ Config load failed:', error);
      throw error;
    }
  },

  /**
   * 設定ファイル保存
   * @param {Object} config - 設定オブジェクト
   * @param {string} [filePath] - 保存先パス（省略時はダイアログ表示）
   * @returns {Promise<Object>} 保存結果
   */
  saveConfig: async (config, filePath = null) => {
    console.log('💾 Saving config via IPC:', filePath);
    try {
      const result = await ipcRenderer.invoke('save-config', config, filePath);
      console.log('💾 Config save result:', result);
      return result;
    } catch (error) {
      console.error('❌ Config save failed:', error);
      throw error;
    }
  },

  /**
   * デフォルト設定取得
   * @returns {Promise<Object>} デフォルト設定
   */
  getDefaultConfig: async () => {
    console.log('🔧 Getting default config...');
    try {
      const result = await ipcRenderer.invoke('get-default-config');
      console.log('🔧 Default config result:', result);
      return result;
    } catch (error) {
      console.error('❌ Default config failed:', error);
      throw error;
    }
  },

  /**
   * 最近使用した設定取得
   * @returns {Promise<Array>} 最近の設定リスト
   */
  getRecentConfigs: async () => {
    console.log('📚 Getting recent configs...');
    try {
      const result = await ipcRenderer.invoke('get-recent-configs');
      console.log('📚 Recent configs result:', result);
      return result;
    } catch (error) {
      console.error('❌ Recent configs failed:', error);
      throw error;
    }
  },

  // ファイル操作 API
  /**
   * フォルダパス検証
   * @param {string} folderPath - 検証するフォルダパス
   * @returns {Promise<Object>} 検証結果
   */
  validateFolderPath: async folderPath => {
    console.log('📂 Validating folder path via IPC:', folderPath);
    try {
      const result = await ipcRenderer.invoke('validate-folder-path', folderPath);
      console.log('📂 Folder path validation result:', result);
      return result;
    } catch (error) {
      console.error('❌ Folder path validation failed:', error);
      throw error;
    }
  },

  /**
   * フォルダ選択ダイアログ
   * @returns {Promise<Object>} 選択されたフォルダパス
   */
  selectFolder: async () => {
    console.log('📂 Opening folder selection dialog...');
    try {
      const result = await ipcRenderer.invoke('select-folder');
      console.log('📂 Folder selection result:', result);
      return result;
    } catch (error) {
      console.error('❌ Folder selection failed:', error);
      throw error;
    }
  },

  /**
   * ファイル検索
   * @param {string} directory - 検索ディレクトリ
   * @param {Array} extensions - 対象拡張子
   * @param {Array} excludePatterns - 除外パターン
   * @returns {Promise<Object>} 検索結果
   */
  findFiles: async (directory, extensions, excludePatterns) => {
    console.log('🔍 Finding files via IPC:', directory);
    try {
      const result = await ipcRenderer.invoke('find-files', directory, extensions, excludePatterns);
      console.log('🔍 Find files result:', result);
      return result;
    } catch (error) {
      console.error('❌ Find files failed:', error);
      throw error;
    }
  },

  /**
   * ファイル読み込み
   * @param {string} filePath - ファイルパス
   * @returns {Promise<Object>} ファイル内容
   */
  readFile: async filePath => {
    console.log('📄 Reading file via IPC:', filePath);
    try {
      const result = await ipcRenderer.invoke('read-file', filePath);
      console.log('📄 Read file result:', result);
      return result;
    } catch (error) {
      console.error('❌ Read file failed:', error);
      throw error;
    }
  },

  /**
   * ファイル書き込み
   * @param {string} filePath - ファイルパス
   * @param {string} content - ファイル内容
   * @returns {Promise<Object>} 書き込み結果
   */
  writeFile: async (filePath, content) => {
    console.log('💾 Writing file via IPC:', filePath);
    try {
      const result = await ipcRenderer.invoke('write-file', filePath, content);
      console.log('💾 Write file result:', result);
      return result;
    } catch (error) {
      console.error('❌ Write file failed:', error);
      throw error;
    }
  },

  // 新しいファイル検索エンジン API
  /**
   * 高速ファイル検索（新エンジン）
   * @param {string} directory - 検索ディレクトリ
   * @param {Array} extensions - 対象拡張子
   * @param {Object} options - 検索オプション
   * @returns {Promise<Object>} 検索結果
   */
  searchFiles: async (directory, extensions, options = {}) => {
    console.log('🚀 Searching files with new engine:', { directory, extensions, options });
    try {
      const result = await ipcRenderer.invoke('search-files', directory, extensions, options);
      console.log('🚀 Search files result:', result);
      return result;
    } catch (error) {
      console.error('❌ Search files failed:', error);
      throw error;
    }
  },

  /**
   * ファイル検索キャンセル
   * @returns {Promise<Object>} キャンセル結果
   */
  cancelSearch: async () => {
    console.log('🛑 Cancelling file search...');
    try {
      const result = await ipcRenderer.invoke('cancel-search');
      console.log('🛑 Cancel search result:', result);
      return result;
    } catch (error) {
      console.error('❌ Cancel search failed:', error);
      throw error;
    }
  },

  /**
   * 検索統計情報取得
   * @returns {Promise<Object>} 統計情報
   */
  getSearchStats: async () => {
    console.log('📈 Getting search stats...');
    try {
      const result = await ipcRenderer.invoke('get-search-stats');
      console.log('📈 Search stats result:', result);
      return result;
    } catch (error) {
      console.error('❌ Get search stats failed:', error);
      throw error;
    }
  },

  /**
   * 検索進捗イベントリスナー設定
   * @param {Function} callback - 進捗コールバック
   */
  onSearchProgress: callback => {
    console.log('📊 Setting up search progress listener');
    ipcRenderer.on('search-progress', (event, progressData) => {
      console.log('📊 Search progress:', progressData);
      callback(progressData);
    });
  },

  /**
   * 検索進捗イベントリスナー削除
   */
  removeSearchProgressListener: () => {
    console.log('🔇 Removing search progress listener');
    ipcRenderer.removeAllListeners('search-progress');
  },

  // Grep内容検索 API
  /**
   * Grep内容検索
   * @param {Object} config - { targetFolders, extensions, pattern, caseSensitive }
   * @returns {Promise<Object>} { success, results, stats }
   */
  grepSearch: async config => {
    try {
      return await ipcRenderer.invoke('grep-search', config);
    } catch (error) {
      console.error('❌ Grep search failed:', error);
      throw error;
    }
  },

  /** Grep検索キャンセル */
  cancelGrep: async () => {
    try {
      return await ipcRenderer.invoke('grep-cancel');
    } catch (error) {
      console.error('❌ Cancel grep failed:', error);
      throw error;
    }
  },

  /** Grep進捗イベントリスナー設定 */
  onGrepProgress: callback => {
    ipcRenderer.on('grep-progress', (event, progressData) => callback(progressData));
  },

  /** Grep進捗イベントリスナー削除 */
  removeGrepProgressListener: () => {
    ipcRenderer.removeAllListeners('grep-progress');
  },

  // 置換エンジン API
  /**
   * 複数ファイル一括置換処理
   * @param {Array} files - ファイルパス配列
   * @param {Array} rules - 置換ルール配列
   * @param {Object} options - 置換オプション
   * @returns {Promise<Object>} 置換結果
   */
  processFiles: async (files, rules, options = {}) => {
    console.log('🔄 Processing files with replacement engine:', {
      fileCount: files.length,
      ruleCount: rules.length,
      options,
    });
    try {
      const result = await ipcRenderer.invoke('process-files', files, rules, options);
      console.log('🔄 Process files result:', result);
      return result;
    } catch (error) {
      console.error('❌ Process files failed:', error);
      throw error;
    }
  },

  /**
   * 単一ファイル置換処理
   * @param {string} filePath - ファイルパス
   * @param {Array} rules - 置換ルール配列
   * @returns {Promise<Object>} 置換結果
   */
  processFile: async (filePath, rules) => {
    console.log('📝 Processing single file:', { filePath, ruleCount: rules.length });
    try {
      const result = await ipcRenderer.invoke('process-file', filePath, rules);
      console.log('📝 Process file result:', result);
      return result;
    } catch (error) {
      console.error('❌ Process file failed:', error);
      throw error;
    }
  },

  /**
   * 置換プレビュー生成
   * @param {Array} files - ファイルパス配列
   * @param {Array} rules - 置換ルール配列
   * @param {number} limit - プレビュー件数制限
   * @returns {Promise<Object>} プレビュー結果
   */
  generatePreview: async (files, rules, limit = 10) => {
    console.log('👀 Generating replacement preview:', {
      fileCount: files.length,
      ruleCount: rules.length,
      limit,
    });
    try {
      const result = await ipcRenderer.invoke('generate-preview', files, rules, limit);
      console.log('👀 Generate preview result:', result);
      return result;
    } catch (error) {
      console.error('❌ Generate preview failed:', error);
      throw error;
    }
  },

  /**
   * 置換実行
   * @param {Object} config - 置換設定
   * @returns {Promise<Object>} 実行結果
   */
  executeReplacement: async config => {
    console.log('🚀 Executing replacement...', config);
    try {
      const result = await ipcRenderer.invoke('executeReplacement', config);
      console.log('🚀 Replacement execution result:', result);
      return result;
    } catch (error) {
      console.error('❌ Replacement execution failed:', error);
      throw error;
    }
  },

  /**
   * 置換処理キャンセル
   * @returns {Promise<Object>} キャンセル結果
   */
  cancelReplacement: async () => {
    console.log('🛑 Cancelling replacement processing...');
    try {
      const result = await ipcRenderer.invoke('cancel-replacement');
      console.log('🛑 Cancel replacement result:', result);
      return result;
    } catch (error) {
      console.error('❌ Cancel replacement failed:', error);
      throw error;
    }
  },

  /**
   * 置換統計情報取得
   * @returns {Promise<Object>} 統計情報
   */
  getReplacementStats: async () => {
    console.log('📊 Getting replacement stats...');
    try {
      const result = await ipcRenderer.invoke('get-replacement-stats');
      console.log('📊 Replacement stats result:', result);
      return result;
    } catch (error) {
      console.error('❌ Get replacement stats failed:', error);
      throw error;
    }
  },

  /**
   * 置換進捗イベントリスナー設定
   * @param {Function} callback - 進捗コールバック
   */
  onReplacementProgress: callback => {
    console.log('📈 Setting up replacement progress listener');
    ipcRenderer.on('replacement-progress', (event, progressData) => {
      console.log('📈 Replacement progress:', progressData);
      callback(progressData);
    });
  },

  /**
   * 置換開始イベントリスナー設定
   * @param {Function} callback - 開始コールバック
   */
  onReplacementStart: callback => {
    console.log('🚀 Setting up replacement start listener');
    ipcRenderer.on('replacement-start', (event, startData) => {
      console.log('🚀 Replacement started:', startData);
      callback(startData);
    });
  },

  /**
   * 置換完了イベントリスナー設定
   * @param {Function} callback - 完了コールバック
   */
  onReplacementComplete: callback => {
    console.log('✅ Setting up replacement complete listener');
    ipcRenderer.on('replacement-complete', (event, completeData) => {
      console.log('✅ Replacement completed:', completeData);
      callback(completeData);
    });
  },

  /**
   * 置換エラーイベントリスナー設定
   * @param {Function} callback - エラーコールバック
   */
  onReplacementError: callback => {
    console.log('🚨 Setting up replacement error listener');
    ipcRenderer.on('replacement-error', (event, errorData) => {
      console.log('🚨 Replacement error:', errorData);
      callback(errorData);
    });
  },

  /**
   * 置換関連イベントリスナー削除
   */
  removeReplacementListeners: () => {
    console.log('🔇 Removing replacement event listeners');
    ipcRenderer.removeAllListeners('replacement-progress');
    ipcRenderer.removeAllListeners('replacement-start');
    ipcRenderer.removeAllListeners('replacement-complete');
    ipcRenderer.removeAllListeners('replacement-error');
  },
});

/**
 * セキュリティ検証
 */
const validateSecurity = () => {
  // preloadスクリプト内では require は利用可能 (正常)
  // レンダラープロセスでの require 利用をチェック
  if (typeof window !== 'undefined' && typeof window.require !== 'undefined') {
    console.warn('⚠️ Potential context isolation bypass detected');
  }

  // process オブジェクトの漏れを検証
  if (typeof window !== 'undefined' && typeof window.process !== 'undefined') {
    console.warn('⚠️ process object leak detected in renderer process');
    console.warn('This could cause ReferenceError: process is not defined');
  }

  console.log('🔒 Security validation completed - preload context is secure');
};

/**
 * パフォーマンス監視初期化
 */
const initializePerformanceMonitoring = () => {
  // タイミングAPI利用可能性確認
  if (typeof performance !== 'undefined') {
    console.log('📊 Performance API available');

    // メモリ監視（Chrome限定）
    if (performance.memory) {
      const { memory } = performance;
      console.log(
        `💾 Memory: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB used / ${(
          memory.totalJSHeapSize /
          1024 /
          1024
        ).toFixed(2)}MB total`
      );
    }
  }
};

/**
 * エラーハンドリング設定
 */
const setupErrorHandling = () => {
  // 未処理のエラーをキャッチ
  window.addEventListener('error', event => {
    console.error('🚨 Unhandled error:', event.error);

    // 将来の拡張: エラー報告
    // ipcRenderer.send('error-report', {
    //   message: event.error.message,
    //   stack: event.error.stack,
    //   timestamp: Date.now()
    // });
  });

  // 未処理のPromise rejectionをキャッチ
  window.addEventListener('unhandledrejection', event => {
    console.error('🚨 Unhandled promise rejection:', event.reason);

    // 将来の拡張: Promise rejectionエラー報告
    // ipcRenderer.send('promise-rejection', {
    //   reason: event.reason,
    //   timestamp: Date.now()
    // });
  });
};

// 初期化実行
try {
  validateSecurity();
  initializePerformanceMonitoring();
  setupErrorHandling();

  console.log('✅ Preload script initialized successfully');
} catch (error) {
  console.error('❌ Preload script initialization failed:', error);
}

/**
 * デバッグ情報（開発時のみ）
 */
// 開発時デバッグ情報（process.envは使用不可のためコメントアウト）
console.log('🔧 Debug mode active');
console.log('📊 ElectronAPI loaded successfully');

// メッセージ送信テスト用（将来の拡張）
// window.electronAPI.testMessage = (message) => {
//   console.log('📨 Test message:', message);
//   return Promise.resolve({ status: 'received', message });
// };
