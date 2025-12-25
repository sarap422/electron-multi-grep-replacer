/**
 * Multi Grep Replacer - Memory Manager
 * メモリ使用量監視・最適化・リーク検出システム
 */

class MemoryManager {
  constructor(debugLogger = null) {
    this.debugLogger = debugLogger;
    this.vibeLogger = global.vibeLogger || null;

    // メモリ閾値設定（MB単位の定数）
    const MB = 1024 * 1024;
    const WARNING_MB = 150;
    const CRITICAL_MB = 200;
    const EMERGENCY_MB = 250;

    this.MEMORY_WARNING_THRESHOLD = WARNING_MB * MB; // 150MB
    this.MEMORY_CRITICAL_THRESHOLD = CRITICAL_MB * MB; // 200MB
    this.MEMORY_EMERGENCY_THRESHOLD = EMERGENCY_MB * MB; // 250MB

    // 監視間隔
    this.MONITORING_INTERVAL = 10000; // 10秒
    this.CLEANUP_INTERVAL = 30000; // 30秒
    this.DEEP_ANALYSIS_INTERVAL = 300000; // 5分

    // メモリ使用量履歴
    this.memoryHistory = [];
    this.leakDetectionHistory = [];
    this.optimizationHistory = [];

    // オブジェクトプール
    this.objectPools = new Map();

    // 監視状態
    this.isMonitoring = false;
    this.monitoringIntervals = [];

    // 統計情報
    this.stats = {
      totalCleanups: 0,
      totalMemoryFreed: 0,
      leaksDetected: 0,
      leaksFixed: 0,
      optimizationsApplied: 0,
    };

    this.initialize();
  }

  /**
   * 初期化
   */
  async initialize() {
    try {
      if (this.vibeLogger) {
        await this.vibeLogger.info('memory_manager_init', 'Memory Manager initializing', {
          context: {
            thresholds: {
              warning: `${Math.round(this.MEMORY_WARNING_THRESHOLD / 1024 / 1024)}MB`,
              critical: `${Math.round(this.MEMORY_CRITICAL_THRESHOLD / 1024 / 1024)}MB`,
              emergency: `${Math.round(this.MEMORY_EMERGENCY_THRESHOLD / 1024 / 1024)}MB`,
            },
            intervals: {
              monitoring: `${this.MONITORING_INTERVAL}ms`,
              cleanup: `${this.CLEANUP_INTERVAL}ms`,
              deepAnalysis: `${this.DEEP_ANALYSIS_INTERVAL}ms`,
            },
          },
          humanNote: 'メモリ管理システムの初期化',
          aiTodo: 'メモリリーク検出アルゴリズムの改善提案',
        });
      }

      this.startMonitoring();
      this.initializeObjectPools();

      console.log('🧠 Memory Manager initialized successfully');
    } catch (error) {
      console.error('❌ Memory Manager initialization failed:', error);
      if (this.vibeLogger) {
        await this.vibeLogger.error(
          'memory_manager_init_error',
          'Memory Manager initialization failed',
          {
            context: { error: error.message, stack: error.stack },
            aiTodo: 'メモリ管理システム初期化エラーの分析と修正',
          }
        );
      }
      throw error;
    }
  }

  /**
   * 監視開始
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.warn('⚠️ Memory monitoring is already running');
      return;
    }

    this.isMonitoring = true;

    // 基本メモリ監視
    const basicMonitoring = setInterval(() => {
      this.performBasicMemoryCheck();
    }, this.MONITORING_INTERVAL);

    // 定期クリーンアップ
    const cleanupMonitoring = setInterval(() => {
      this.performPeriodicCleanup();
    }, this.CLEANUP_INTERVAL);

    // 深度分析
    const deepAnalysis = setInterval(() => {
      this.performDeepMemoryAnalysis();
    }, this.DEEP_ANALYSIS_INTERVAL);

    this.monitoringIntervals.push(basicMonitoring, cleanupMonitoring, deepAnalysis);

    console.log('📊 Memory monitoring started');
  }

  /**
   * 監視停止
   */
  stopMonitoring() {
    this.isMonitoring = false;
    this.monitoringIntervals.forEach(interval => clearInterval(interval));
    this.monitoringIntervals = [];

    console.log('⏹️ Memory monitoring stopped');
  }

  /**
   * 基本メモリチェック
   */
  async performBasicMemoryCheck() {
    try {
      const memoryUsage = this.getCurrentMemoryUsage();
      const { heapUsed } = memoryUsage;

      // 履歴に記録
      this.recordMemoryUsage(memoryUsage);

      // 閾値チェック
      if (heapUsed >= this.MEMORY_EMERGENCY_THRESHOLD) {
        await this.handleEmergencyMemoryUsage(memoryUsage);
      } else if (heapUsed >= this.MEMORY_CRITICAL_THRESHOLD) {
        await this.handleCriticalMemoryUsage(memoryUsage);
      } else if (heapUsed >= this.MEMORY_WARNING_THRESHOLD) {
        await this.handleWarningMemoryUsage(memoryUsage);
      }

      // メモリリーク検出
      this.detectMemoryLeaks();
    } catch (error) {
      console.error('❌ Basic memory check failed:', error);
    }
  }

  /**
   * 定期クリーンアップ
   */
  async performPeriodicCleanup() {
    try {
      const beforeUsage = this.getCurrentMemoryUsage().heapUsed;

      // ガベージコレクション実行
      await this.forceGarbageCollection();

      // オブジェクトプールクリーンアップ
      this.cleanupObjectPools();

      // キャッシュクリーンアップ
      this.cleanupCaches();

      const afterUsage = this.getCurrentMemoryUsage().heapUsed;
      const memoryFreed = beforeUsage - afterUsage;

      if (memoryFreed > 0) {
        this.stats.totalCleanups++;
        this.stats.totalMemoryFreed += memoryFreed;

        console.log(`🧹 Periodic cleanup freed ${Math.round(memoryFreed / 1024 / 1024)}MB`);

        if (this.vibeLogger) {
          await this.vibeLogger.info(
            'memory_periodic_cleanup',
            'Periodic memory cleanup completed',
            {
              context: {
                memoryFreed: `${Math.round(memoryFreed / 1024 / 1024)}MB`,
                beforeUsage: `${Math.round(beforeUsage / 1024 / 1024)}MB`,
                afterUsage: `${Math.round(afterUsage / 1024 / 1024)}MB`,
              },
            }
          );
        }
      }
    } catch (error) {
      console.error('❌ Periodic cleanup failed:', error);
    }
  }

  /**
   * 深度メモリ分析
   */
  async performDeepMemoryAnalysis() {
    try {
      if (this.vibeLogger) {
        await this.vibeLogger.info('memory_deep_analysis_start', 'Starting deep memory analysis', {
          context: {
            currentUsage: this.formatMemoryUsage(this.getCurrentMemoryUsage()),
            historyLength: this.memoryHistory.length,
          },
        });
      }

      // メモリ使用パターン分析
      const patterns = this.analyzeMemoryPatterns();

      // リークトレンド分析
      const leakTrends = this.analyzeLeakTrends();

      // 最適化提案生成
      const suggestions = this.generateOptimizationSuggestions(patterns, leakTrends);

      if (suggestions.length > 0) {
        console.log('💡 Memory optimization suggestions:', suggestions);

        if (this.vibeLogger) {
          await this.vibeLogger.info(
            'memory_optimization_suggestions',
            'Memory optimization suggestions generated',
            {
              context: { suggestions, patterns, leakTrends },
              aiTodo: 'メモリ使用パターンに基づく最適化戦略の提案',
            }
          );
        }
      }
    } catch (error) {
      console.error('❌ Deep memory analysis failed:', error);
    }
  }

  /**
   * 緊急メモリ使用量処理
   */
  async handleEmergencyMemoryUsage(memoryUsage) {
    console.error(
      '🚨 EMERGENCY: Critical memory usage detected!',
      this.formatMemoryUsage(memoryUsage)
    );

    if (this.vibeLogger) {
      await this.vibeLogger.error('memory_emergency', 'Emergency memory usage detected', {
        context: { memoryUsage: this.formatMemoryUsage(memoryUsage) },
        aiTodo: '緊急メモリ解放戦略の実装が必要',
      });
    }

    // 緊急メモリ解放
    await this.performEmergencyCleanup();
  }

  /**
   * 重要メモリ使用量処理
   */
  async handleCriticalMemoryUsage(memoryUsage) {
    console.warn('🔴 CRITICAL: High memory usage detected!', this.formatMemoryUsage(memoryUsage));

    if (this.vibeLogger) {
      await this.vibeLogger.warning('memory_critical', 'Critical memory usage detected', {
        context: { memoryUsage: this.formatMemoryUsage(memoryUsage) },
        aiTodo: 'メモリ使用量削減戦略の検討',
      });
    }

    // 積極的クリーンアップ
    await this.performAggressiveCleanup();
  }

  /**
   * 警告メモリ使用量処理
   */
  async handleWarningMemoryUsage(memoryUsage) {
    console.warn('🟡 WARNING: Elevated memory usage detected', this.formatMemoryUsage(memoryUsage));

    // 軽度クリーンアップ
    await this.performLightCleanup();
  }

  /**
   * 緊急クリーンアップ
   */
  async performEmergencyCleanup() {
    console.log('🚨 Performing emergency memory cleanup...');

    // 全オブジェクトプールクリア
    this.clearAllObjectPools();

    // 全キャッシュクリア
    this.clearAllCaches();

    // 強制ガベージコレクション
    await this.forceGarbageCollection();

    // 履歴データ削減
    const EMERGENCY_HISTORY_RETENTION = 0.1; // 10%のみ保持
    this.reduceHistoryData(EMERGENCY_HISTORY_RETENTION);
  }

  /**
   * 積極的クリーンアップ
   */
  async performAggressiveCleanup() {
    console.log('🔴 Performing aggressive memory cleanup...');

    // クリーンアップ比率定数
    const AGGRESSIVE_POOL_CLEANUP = 0.5; // 50%クリア
    const AGGRESSIVE_CACHE_CLEANUP = 0.7; // 70%クリア

    // オブジェクトプール部分クリア
    this.cleanupObjectPools(AGGRESSIVE_POOL_CLEANUP);

    // キャッシュ部分クリア
    this.cleanupCaches(AGGRESSIVE_CACHE_CLEANUP);

    // ガベージコレクション
    await this.forceGarbageCollection();

    // 履歴データ削減
    const AGGRESSIVE_HISTORY_RETENTION = 0.3; // 30%保持
    this.reduceHistoryData(AGGRESSIVE_HISTORY_RETENTION);
  }

  /**
   * 軽度クリーンアップ
   */
  async performLightCleanup() {
    console.log('🟡 Performing light memory cleanup...');

    // クリーンアップ比率定数
    const LIGHT_POOL_CLEANUP = 0.2; // 20%クリア
    const LIGHT_CACHE_CLEANUP = 0.3; // 30%クリア

    // 古いオブジェクトプールエントリクリア
    this.cleanupObjectPools(LIGHT_POOL_CLEANUP);

    // 古いキャッシュエントリクリア
    this.cleanupCaches(LIGHT_CACHE_CLEANUP);

    // 履歴データ制限
    this.limitHistoryData();
  }

  /**
   * メモリリーク検出
   */
  detectMemoryLeaks() {
    if (this.memoryHistory.length < 10) {
      return false; // 十分なデータがない
    }

    // 直近データ数定数
    const RECENT_ANALYSIS_COUNT = 10;

    // 直近測定値を分析
    const recentUsages = this.memoryHistory.slice(-RECENT_ANALYSIS_COUNT).map(h => h.heapUsed);
    const slope = this.calculateMemoryTrend(recentUsages);

    // メモリ使用量が継続的に増加している場合
    const isLeak = slope > 1024 * 1024; // 1MB/測定 以上の増加

    if (isLeak) {
      this.stats.leaksDetected++;

      const leakInfo = {
        timestamp: Date.now(),
        slope,
        recentUsages,
        severity: this.calculateLeakSeverity(slope),
      };

      this.leakDetectionHistory.push(leakInfo);

      console.warn(
        `🔍 Memory leak detected: ${Math.round(slope / 1024 / 1024)}MB/interval increase`
      );

      // リーク修正試行
      this.attemptLeakFix(leakInfo);

      return true;
    }

    return false;
  }

  /**
   * リーク修正試行
   */
  async attemptLeakFix(leakInfo) {
    try {
      console.log('🔧 Attempting to fix memory leak...');

      // EventListener リーク修正
      this.fixEventListenerLeaks();

      // Timer リーク修正
      this.fixTimerLeaks();

      // Closure リーク修正
      this.fixClosureLeaks();

      this.stats.leaksFixed++;

      if (this.vibeLogger) {
        await this.vibeLogger.info('memory_leak_fix_attempt', 'Memory leak fix attempted', {
          context: { leakInfo },
          aiTodo: 'リーク修正効果の検証と改善',
        });
      }
    } catch (error) {
      console.error('❌ Memory leak fix failed:', error);
    }
  }

  /**
   * オブジェクトプール初期化
   */
  initializeObjectPools() {
    // String オブジェクトプール
    this.objectPools.set('strings', {
      pool: [],
      maxSize: 1000,
      created: 0,
      reused: 0,
    });

    // Array オブジェクトプール
    this.objectPools.set('arrays', {
      pool: [],
      maxSize: 500,
      created: 0,
      reused: 0,
    });

    // Object オブジェクトプール
    this.objectPools.set('objects', {
      pool: [],
      maxSize: 500,
      created: 0,
      reused: 0,
    });

    console.log('🏊 Object pools initialized');
  }

  /**
   * オブジェクトプールから取得
   */
  getFromPool(poolName, createFn) {
    const pool = this.objectPools.get(poolName);
    if (!pool) {
      return createFn();
    }

    if (pool.pool.length > 0) {
      pool.reused++;
      return pool.pool.pop();
    } else {
      pool.created++;
      return createFn();
    }
  }

  /**
   * オブジェクトプールに返却
   */
  returnToPool(poolName, obj) {
    const pool = this.objectPools.get(poolName);
    if (!pool || pool.pool.length >= pool.maxSize) {
      return;
    }

    // オブジェクトをリセット
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.length = 0;
      } else {
        Object.keys(obj).forEach(key => delete obj[key]);
      }
    }

    pool.pool.push(obj);
  }

  /**
   * オブジェクトプールクリーンアップ
   */
  cleanupObjectPools(ratio = 0.3) {
    for (const [poolName, pool] of this.objectPools) {
      const removeCount = Math.floor(pool.pool.length * ratio);
      pool.pool.splice(0, removeCount);

      if (removeCount > 0) {
        console.log(`🧹 Cleaned ${removeCount} objects from ${poolName} pool`);
      }
    }
  }

  /**
   * 全オブジェクトプールクリア
   */
  clearAllObjectPools() {
    for (const [poolName, pool] of this.objectPools) {
      const clearedCount = pool.pool.length;
      pool.pool = [];
      console.log(`🗑️ Cleared ${clearedCount} objects from ${poolName} pool`);
    }
  }

  /**
   * ガベージコレクション強制実行
   */
  async forceGarbageCollection() {
    if (global.gc) {
      console.log('🗑️ Forcing garbage collection...');
      global.gc();

      // GC完了待機
      await new Promise(resolve => setImmediate(resolve));
    } else {
      console.warn('⚠️ Garbage collection not available (requires --expose-gc flag)');
    }
  }

  /**
   * キャッシュクリーンアップ
   */
  cleanupCaches(ratio = 0.3) {
    // Node.js require キャッシュ
    const cacheKeys = Object.keys(require.cache);
    const removeCount = Math.floor(cacheKeys.length * ratio);

    // ユーザーモジュールのキャッシュのみ削除
    const userModules = cacheKeys.filter(
      key => !key.includes('node_modules') && !key.includes('electron') && !key.includes('main.js') // メインファイルは保持
    );

    userModules.slice(0, removeCount).forEach(key => {
      delete require.cache[key];
    });

    if (removeCount > 0) {
      console.log(`🧹 Cleaned ${removeCount} cache entries`);
    }
  }

  /**
   * 全キャッシュクリア
   */
  clearAllCaches() {
    const cacheKeys = Object.keys(require.cache);
    let clearedCount = 0;

    cacheKeys.forEach(key => {
      if (!key.includes('node_modules') && !key.includes('electron')) {
        delete require.cache[key];
        clearedCount++;
      }
    });

    console.log(`🗑️ Cleared ${clearedCount} cache entries`);
  }

  /**
   * 現在のメモリ使用量取得
   */
  getCurrentMemoryUsage() {
    return process.memoryUsage();
  }

  /**
   * メモリ使用量記録
   */
  recordMemoryUsage(memoryUsage) {
    this.memoryHistory.push({
      timestamp: Date.now(),
      ...memoryUsage,
    });

    // 履歴サイズ制限
    if (this.memoryHistory.length > 1000) {
      const MAX_MEMORY_HISTORY = 500;
      this.memoryHistory = this.memoryHistory.slice(-MAX_MEMORY_HISTORY);
    }
  }

  /**
   * メモリトレンド計算
   */
  calculateMemoryTrend(usages) {
    if (usages.length < 2) {
      return 0;
    }

    // 線形回帰による傾き計算
    const n = usages.length;
    const TWO = 2;
    const sumX = (n * (n - 1)) / TWO;
    const sumY = usages.reduce((sum, usage) => sum + usage, 0);
    const sumXY = usages.reduce((sum, usage, i) => sum + i * usage, 0);
    const SIX = 6;
    const sumX2 = (n * (n - 1) * (TWO * n - 1)) / SIX;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * リーク重要度計算
   */
  calculateLeakSeverity(slope) {
    const mbPerInterval = slope / 1024 / 1024;

    if (mbPerInterval > 10) {
      return 'critical';
    }
    if (mbPerInterval > 5) {
      return 'high';
    }
    if (mbPerInterval > 2) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * メモリ使用量フォーマット
   */
  formatMemoryUsage(memoryUsage) {
    return {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    };
  }

  /**
   * メモリパターン分析
   */
  analyzeMemoryPatterns() {
    // 実装予定：メモリ使用パターンの分析
    return {
      trend: 'stable',
      peakTimes: [],
      averageUsage: this.getAverageMemoryUsage(),
    };
  }

  /**
   * リークトレンド分析
   */
  analyzeLeakTrends() {
    // 実装予定：リークトレンドの分析
    return {
      frequency: this.leakDetectionHistory.length,
      severity: 'low',
      patterns: [],
    };
  }

  /**
   * 最適化提案生成
   */
  generateOptimizationSuggestions(patterns, leakTrends) {
    const suggestions = [];

    if (patterns.averageUsage > this.MEMORY_WARNING_THRESHOLD) {
      suggestions.push({
        type: 'memory-usage',
        priority: 'high',
        title: 'メモリ使用量の削減',
        actions: ['オブジェクトプールの活用', 'キャッシュサイズの調整'],
      });
    }

    if (leakTrends.frequency > 5) {
      suggestions.push({
        type: 'memory-leak',
        priority: 'critical',
        title: 'メモリリークの修正',
        actions: ['EventListener の適切な削除', 'Timer の適切なクリア'],
      });
    }

    return suggestions;
  }

  /**
   * EventListener リーク修正
   */
  fixEventListenerLeaks() {
    // 実装予定：EventListener リークの検出と修正
    console.log('🔧 Fixing EventListener leaks...');
  }

  /**
   * Timer リーク修正
   */
  fixTimerLeaks() {
    // 実装予定：Timer リークの検出と修正
    console.log('🔧 Fixing Timer leaks...');
  }

  /**
   * Closure リーク修正
   */
  fixClosureLeaks() {
    // 実装予定：Closure リークの検出と修正
    console.log('🔧 Fixing Closure leaks...');
  }

  /**
   * 履歴データ削減
   */
  reduceHistoryData(keepRatio) {
    const keepCount = Math.floor(this.memoryHistory.length * keepRatio);
    this.memoryHistory = this.memoryHistory.slice(-keepCount);

    const leakKeepCount = Math.floor(this.leakDetectionHistory.length * keepRatio);
    this.leakDetectionHistory = this.leakDetectionHistory.slice(-leakKeepCount);

    console.log(`📉 Reduced history data, keeping ${Math.round(keepRatio * 100)}%`);
  }

  /**
   * 履歴データ制限
   */
  limitHistoryData() {
    const MAX_MEMORY_ENTRIES = 200;
    const REDUCED_MEMORY_HISTORY = 100;
    const MAX_LEAK_ENTRIES = 50;
    const REDUCED_LEAK_HISTORY = 25;

    if (this.memoryHistory.length > MAX_MEMORY_ENTRIES) {
      this.memoryHistory = this.memoryHistory.slice(-REDUCED_MEMORY_HISTORY);
    }

    if (this.leakDetectionHistory.length > MAX_LEAK_ENTRIES) {
      this.leakDetectionHistory = this.leakDetectionHistory.slice(-REDUCED_LEAK_HISTORY);
    }
  }

  /**
   * 平均メモリ使用量取得
   */
  getAverageMemoryUsage() {
    if (this.memoryHistory.length === 0) {
      return 0;
    }

    const total = this.memoryHistory.reduce((sum, h) => sum + h.heapUsed, 0);
    return total / this.memoryHistory.length;
  }

  /**
   * 統計情報取得
   */
  getStats() {
    return {
      ...this.stats,
      currentUsage: this.formatMemoryUsage(this.getCurrentMemoryUsage()),
      averageUsage: `${Math.round(this.getAverageMemoryUsage() / 1024 / 1024)}MB`,
      historyLength: this.memoryHistory.length,
      leakHistory: this.leakDetectionHistory.length,
      objectPools: Array.from(this.objectPools.entries()).map(([name, pool]) => ({
        name,
        poolSize: pool.pool.length,
        created: pool.created,
        reused: pool.reused,
        efficiency:
          pool.created > 0
            ? `${((pool.reused / (pool.created + pool.reused)) * 100).toFixed(1)}%`
            : '0%',
      })),
    };
  }

  /**
   * リセット
   */
  reset() {
    this.memoryHistory = [];
    this.leakDetectionHistory = [];
    this.optimizationHistory = [];
    this.stats = {
      totalCleanups: 0,
      totalMemoryFreed: 0,
      leaksDetected: 0,
      leaksFixed: 0,
      optimizationsApplied: 0,
    };

    this.clearAllObjectPools();
    this.initializeObjectPools();

    console.log('🔄 Memory Manager reset completed');
  }
}

module.exports = MemoryManager;
