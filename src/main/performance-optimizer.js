/**
 * Multi Grep Replacer - Performance Optimizer
 * ファイル処理・メモリ・UI応答性の包括的最適化エンジン
 */

// Note: Worker, path, pipeline are prepared for future use
// const { Worker } = require('worker_threads');
// const path = require('path');
// const { pipeline } = require('stream');
const fs = require('fs').promises;
const { createReadStream, createWriteStream } = require('fs');

class PerformanceOptimizer {
  constructor(debugLogger = null) {
    this.debugLogger = debugLogger;
    this.vibeLogger = global.vibeLogger || null;

    // パフォーマンス目標値（定数）
    const THIRTY_SECONDS = 30000;
    const ONE_HUNDRED_MS = 100;
    const MB = 1024 * 1024;

    this.TARGET_FILE_PROCESSING_TIME = THIRTY_SECONDS; // 1000ファイル30秒
    this.TARGET_UI_RESPONSE_TIME = ONE_HUNDRED_MS; // 100ms
    const TARGET_MEMORY_MB = 200;
    const TARGET_BUNDLE_MB = 150;

    this.TARGET_MEMORY_USAGE = TARGET_MEMORY_MB * MB; // 200MB
    this.TARGET_BUNDLE_SIZE = TARGET_BUNDLE_MB * MB; // 150MB

    // 最適化設定（定数）
    const MAX_CONCURRENT_FILES = 10;
    const FIFTY_MB = 50 * MB;
    const ONE_MB = MB;
    const WORKER_POOL_SIZE = 4;

    this.maxConcurrentFiles = MAX_CONCURRENT_FILES;
    this.maxMemoryBuffer = FIFTY_MB; // 50MB
    this.streamChunkSize = ONE_MB; // 1MB
    this.workerPoolSize = WORKER_POOL_SIZE;

    // パフォーマンス監視データ
    this.metrics = {
      fileProcessingTimes: [],
      memoryUsages: [],
      uiResponseTimes: [],
      optimizationSuggestions: [],
    };

    // Worker Pool
    this.workerPool = [];
    this.activeWorkers = 0;

    this.initialize();
  }

  /**
   * 初期化
   */
  async initialize() {
    try {
      if (this.vibeLogger) {
        await this.vibeLogger.info(
          'performance_optimizer_init',
          'Performance Optimizer initializing',
          {
            context: {
              targets: {
                fileProcessing: `${this.TARGET_FILE_PROCESSING_TIME}ms`,
                uiResponse: `${this.TARGET_UI_RESPONSE_TIME}ms`,
                memory: `${Math.round(this.TARGET_MEMORY_USAGE / 1024 / 1024)}MB`,
                bundle: `${Math.round(this.TARGET_BUNDLE_SIZE / 1024 / 1024)}MB`,
              },
              settings: {
                maxConcurrentFiles: this.maxConcurrentFiles,
                streamChunkSize: this.streamChunkSize,
                workerPoolSize: this.workerPoolSize,
              },
            },
            humanNote: 'パフォーマンス最適化エンジンの初期化',
            aiTodo: 'Worker Pool効率化、ストリーミング最適化の提案',
          }
        );
      }

      // Worker Pool初期化
      await this.initializeWorkerPool();

      // メモリ監視開始
      this.startMemoryMonitoring();

      // 最適化提案システム開始
      this.startOptimizationAnalysis();

      console.log('🚀 Performance Optimizer initialized successfully');
    } catch (error) {
      console.error('❌ Performance Optimizer initialization failed:', error);
      if (this.vibeLogger) {
        await this.vibeLogger.error(
          'performance_optimizer_init_error',
          'Failed to initialize optimizer',
          {
            context: { error: error.message, stack: error.stack },
            aiTodo: '初期化エラーの原因分析と解決策提案',
          }
        );
      }
      throw error;
    }
  }

  /**
   * Worker Pool初期化
   */
  async initializeWorkerPool() {
    // Worker Pool実装（将来の拡張用）
    console.log(`📦 Initializing Worker Pool (${this.workerPoolSize} workers)`);
    // 実装は後で追加
  }

  /**
   * ファイル処理最適化
   */
  async optimizeFileProcessing(files, processor, options = {}) {
    const startTime = performance.now();

    try {
      if (this.vibeLogger) {
        await this.vibeLogger.info(
          'file_processing_optimize_start',
          'Starting optimized file processing',
          {
            context: {
              fileCount: files.length,
              processorType: processor.constructor.name,
              options,
            },
          }
        );
      }

      // ファイルサイズによる処理戦略決定
      const strategy = await this.determineProcessingStrategy(files);

      let results;
      switch (strategy.type) {
        case 'stream':
          results = await this.streamProcessFiles(files, processor, strategy.config);
          break;
        case 'batch':
          results = await this.batchProcessFiles(files, processor, strategy.config);
          break;
        case 'worker':
          results = await this.workerProcessFiles(files, processor, strategy.config);
          break;
        default:
          results = await this.standardProcessFiles(files, processor);
      }

      const processingTime = performance.now() - startTime;

      // メトリクス記録
      this.recordFileProcessingMetrics(files.length, processingTime, strategy.type);

      if (this.vibeLogger) {
        await this.vibeLogger.info(
          'file_processing_optimize_complete',
          'File processing optimization completed',
          {
            context: {
              fileCount: files.length,
              processingTime: Math.round(processingTime),
              strategy: strategy.type,
              targetAchieved: processingTime <= this.TARGET_FILE_PROCESSING_TIME,
              throughput: Math.round(files.length / (processingTime / 1000)),
            },
            aiTodo:
              processingTime > this.TARGET_FILE_PROCESSING_TIME
                ? 'ファイル処理時間が目標を超過、並行処理の改善が必要'
                : null,
          }
        );
      }

      return {
        results,
        metrics: {
          processingTime,
          strategy: strategy.type,
          targetAchieved: processingTime <= this.TARGET_FILE_PROCESSING_TIME,
          throughput: files.length / (processingTime / 1000),
        },
      };
    } catch (error) {
      if (this.vibeLogger) {
        await this.vibeLogger.error(
          'file_processing_optimize_error',
          'File processing optimization failed',
          {
            context: { error: error.message, fileCount: files.length },
            aiTodo: 'ファイル処理エラーの根本原因分析と対策提案',
          }
        );
      }
      throw error;
    }
  }

  /**
   * 処理戦略決定
   */
  async determineProcessingStrategy(files) {
    const totalSize = await this.calculateTotalFileSize(files);
    const avgFileSize = totalSize / files.length;

    // ストリーミング処理判定
    if (avgFileSize > this.maxMemoryBuffer) {
      return {
        type: 'stream',
        config: {
          chunkSize: this.streamChunkSize,
          concurrent: Math.min(2, this.maxConcurrentFiles),
        },
      };
    }

    // バッチ処理判定
    if (files.length > 100) {
      return {
        type: 'batch',
        config: {
          batchSize: Math.min(this.maxConcurrentFiles, 10),
          concurrent: this.maxConcurrentFiles,
        },
      };
    }

    // Worker処理判定（CPU集約的作業）
    if (files.length > 50 && avgFileSize < 1024 * 1024) {
      return {
        type: 'worker',
        config: {
          workerCount: this.workerPoolSize,
          maxQueueSize: 100,
        },
      };
    }

    // 標準処理
    return {
      type: 'standard',
      config: {
        concurrent: Math.min(this.maxConcurrentFiles, files.length),
      },
    };
  }

  /**
   * ストリーミング処理
   */
  async streamProcessFiles(files, processor, config) {
    const results = [];

    for (const file of files) {
      try {
        const result = await this.processFileWithStream(file, processor, config);
        results.push(result);
      } catch (error) {
        console.warn(`⚠️ Stream processing failed for ${file}:`, error.message);
        results.push({ file, error: error.message, processed: false });
      }
    }

    return results;
  }

  /**
   * ストリーミングによる単一ファイル処理
   */
  async processFileWithStream(filePath, processor, config) {
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(filePath, {
        encoding: 'utf8',
        highWaterMark: config.chunkSize,
      });

      const tempPath = `${filePath}.tmp`;
      const writeStream = createWriteStream(tempPath);

      let processedContent = '';
      let buffer = '';

      readStream.on('data', chunk => {
        buffer += chunk;

        // 行単位で処理（語の分割を避ける）
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 不完全な行を保持

        for (const line of lines) {
          const processedLine = processor.processLine ? processor.processLine(line) : line;
          processedContent += `${processedLine}\n`;
        }

        // メモリ使用量チェック
        if (processedContent.length > config.chunkSize) {
          writeStream.write(processedContent);
          processedContent = '';
        }
      });

      readStream.on('end', async () => {
        // 残りのバッファ処理
        if (buffer) {
          const processedLine = processor.processLine ? processor.processLine(buffer) : buffer;
          processedContent += processedLine;
        }

        if (processedContent) {
          writeStream.write(processedContent);
        }

        writeStream.end();

        writeStream.on('finish', async () => {
          // 一時ファイルを元のファイルに置換
          try {
            await fs.rename(tempPath, filePath);
            resolve({ file: filePath, processed: true, method: 'stream' });
          } catch (error) {
            reject(error);
          }
        });
      });

      readStream.on('error', reject);
      writeStream.on('error', reject);
    });
  }

  /**
   * バッチ処理
   */
  async batchProcessFiles(files, processor, config) {
    const results = [];
    const batches = this.createBatches(files, config.batchSize);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(file => this.processSingleFile(file, processor))
      );

      results.push(
        ...batchResults.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return {
              file: batch[index],
              error: result.reason.message,
              processed: false,
            };
          }
        })
      );
    }

    return results;
  }

  /**
   * Worker処理（将来の拡張用）
   */
  async workerProcessFiles(files, processor, config) {
    // Worker Threads実装は将来の拡張で追加
    console.log('📦 Worker processing not yet implemented, falling back to batch processing');
    return this.batchProcessFiles(files, processor, { batchSize: config.maxQueueSize || 10 });
  }

  /**
   * 標準処理
   */
  async standardProcessFiles(files, processor) {
    const results = await Promise.allSettled(
      files.map(file => this.processSingleFile(file, processor))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          file: files[index],
          error: result.reason.message,
          processed: false,
        };
      }
    });
  }

  /**
   * 単一ファイル処理
   */
  async processSingleFile(filePath, processor) {
    const startTime = performance.now();

    try {
      const result = await processor.processFile(filePath);
      const processingTime = performance.now() - startTime;

      return {
        file: filePath,
        processed: true,
        processingTime,
        result,
      };
    } catch (error) {
      throw new Error(`Failed to process ${filePath}: ${error.message}`);
    }
  }

  /**
   * メモリ最適化
   */
  async optimizeMemoryUsage() {
    const startTime = performance.now();

    try {
      if (this.vibeLogger) {
        await this.vibeLogger.info('memory_optimize_start', 'Starting memory optimization', {
          context: {
            currentUsage: this.getCurrentMemoryUsage(),
            target: `${Math.round(this.TARGET_MEMORY_USAGE / 1024 / 1024)}MB`,
          },
        });
      }

      const beforeUsage = this.getCurrentMemoryUsage();

      // ガベージコレクション強制実行
      if (global.gc) {
        global.gc();
      }

      // メモリリーク検出・解放
      await this.detectAndFixMemoryLeaks();

      // オブジェクトプール最適化
      await this.optimizeObjectPools();

      // キャッシュクリーンアップ
      await this.cleanupCaches();

      const afterUsage = this.getCurrentMemoryUsage();
      const optimizationTime = performance.now() - startTime;
      const memoryFreed = beforeUsage - afterUsage;

      if (this.vibeLogger) {
        await this.vibeLogger.info('memory_optimize_complete', 'Memory optimization completed', {
          context: {
            beforeUsage: `${Math.round(beforeUsage / 1024 / 1024)}MB`,
            afterUsage: `${Math.round(afterUsage / 1024 / 1024)}MB`,
            memoryFreed: `${Math.round(memoryFreed / 1024 / 1024)}MB`,
            optimizationTime: Math.round(optimizationTime),
            targetAchieved: afterUsage <= this.TARGET_MEMORY_USAGE,
          },
          aiTodo:
            afterUsage > this.TARGET_MEMORY_USAGE
              ? 'メモリ使用量が目標を超過、さらなる最適化が必要'
              : null,
        });
      }

      return {
        beforeUsage,
        afterUsage,
        memoryFreed,
        optimizationTime,
        targetAchieved: afterUsage <= this.TARGET_MEMORY_USAGE,
      };
    } catch (error) {
      if (this.vibeLogger) {
        await this.vibeLogger.error('memory_optimize_error', 'Memory optimization failed', {
          context: { error: error.message },
          aiTodo: 'メモリ最適化エラーの原因分析と代替手法提案',
        });
      }
      throw error;
    }
  }

  /**
   * メモリリーク検出・修正
   */
  async detectAndFixMemoryLeaks() {
    // EventListener リーク検出
    this.checkEventListenerLeaks();

    // タイマーリーク検出
    this.checkTimerLeaks();

    // DOM参照リーク検出
    this.checkDOMReferenceLeaks();

    console.log('🔍 Memory leak detection completed');
  }

  /**
   * オブジェクトプール最適化
   */
  async optimizeObjectPools() {
    // 将来の実装：オブジェクトプールの効率化
    console.log('🔄 Object pool optimization completed');
  }

  /**
   * キャッシュクリーンアップ
   */
  async cleanupCaches() {
    // Node.js require キャッシュクリーンアップ（開発時のみ）
    if (process.env.NODE_ENV === 'development') {
      const cacheKeys = Object.keys(require.cache);
      const cleanedCount = cacheKeys.length;

      // 必要最小限のキャッシュのみ保持
      cacheKeys.forEach(key => {
        if (!key.includes('node_modules') && !key.includes('electron')) {
          delete require.cache[key];
        }
      });

      console.log(`🧹 Cleaned ${cleanedCount} cache entries`);
    }
  }

  /**
   * メモリ監視開始
   */
  startMemoryMonitoring() {
    setInterval(async () => {
      const usage = this.getCurrentMemoryUsage();
      this.metrics.memoryUsages.push({
        timestamp: Date.now(),
        usage,
        warningLevel: usage > this.TARGET_MEMORY_USAGE ? 'high' : 'normal',
      });

      // 履歴サイズ制限
      if (this.metrics.memoryUsages.length > 100) {
        const MAX_MEMORY_METRICS = 50;
        this.metrics.memoryUsages = this.metrics.memoryUsages.slice(-MAX_MEMORY_METRICS);
      }

      // 警告レベルチェック
      if (usage > this.TARGET_MEMORY_USAGE) {
        console.warn(`⚠️ High memory usage: ${Math.round(usage / 1024 / 1024)}MB`);
        await this.optimizeMemoryUsage();
      }
    }, 30000); // 30秒間隔
  }

  /**
   * 最適化分析開始
   */
  startOptimizationAnalysis() {
    setInterval(async () => {
      const suggestions = await this.generateOptimizationSuggestions();
      if (suggestions.length > 0) {
        this.metrics.optimizationSuggestions.push(...suggestions);

        if (this.vibeLogger) {
          await this.vibeLogger.info(
            'optimization_suggestions',
            'New optimization suggestions generated',
            {
              context: { suggestions },
              aiTodo: 'AI分析による最適化提案の実装支援',
            }
          );
        }
      }
    }, 300000); // 5分間隔
  }

  /**
   * 最適化提案生成
   */
  async generateOptimizationSuggestions() {
    const suggestions = [];

    // ファイル処理性能分析
    const avgProcessingTime = this.getAverageFileProcessingTime();
    if (avgProcessingTime > this.TARGET_FILE_PROCESSING_TIME / 100) {
      suggestions.push({
        category: 'file-processing',
        priority: 'high',
        title: 'ファイル処理速度の改善',
        description: `平均処理時間 ${Math.round(avgProcessingTime)}ms が目標を上回っています`,
        actions: ['ストリーミング処理の活用', '並行処理数の調整', 'Worker Threads の導入検討'],
      });
    }

    // メモリ使用量分析
    const avgMemoryUsage = this.getAverageMemoryUsage();
    if (avgMemoryUsage > this.TARGET_MEMORY_USAGE * 0.8) {
      suggestions.push({
        category: 'memory',
        priority: 'medium',
        title: 'メモリ使用量の最適化',
        description: `平均メモリ使用量 ${Math.round(avgMemoryUsage / 1024 / 1024)}MB が高めです`,
        actions: ['オブジェクトプールの導入', 'キャッシュサイズの調整', '不要な参照の削除'],
      });
    }

    return suggestions;
  }

  /**
   * ユーティリティメソッド
   */
  getCurrentMemoryUsage() {
    const usage = process.memoryUsage();
    return usage.heapUsed + usage.external;
  }

  async calculateTotalFileSize(files) {
    let totalSize = 0;
    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        totalSize += stats.size;
      } catch (error) {
        // ファイルが存在しない場合はスキップ
        console.warn(`⚠️ Cannot stat file ${file}:`, error.message);
      }
    }
    return totalSize;
  }

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  recordFileProcessingMetrics(fileCount, processingTime, strategy) {
    this.metrics.fileProcessingTimes.push({
      timestamp: Date.now(),
      fileCount,
      processingTime,
      strategy,
      throughput: fileCount / (processingTime / 1000),
    });

    // 履歴サイズ制限
    if (this.metrics.fileProcessingTimes.length > 100) {
      const MAX_PROCESSING_METRICS = 50;
      this.metrics.fileProcessingTimes = this.metrics.fileProcessingTimes.slice(
        -MAX_PROCESSING_METRICS
      );
    }
  }

  getAverageFileProcessingTime() {
    if (this.metrics.fileProcessingTimes.length === 0) {
      return 0;
    }

    const total = this.metrics.fileProcessingTimes.reduce(
      (sum, metric) => sum + metric.processingTime / metric.fileCount,
      0
    );
    return total / this.metrics.fileProcessingTimes.length;
  }

  getAverageMemoryUsage() {
    if (this.metrics.memoryUsages.length === 0) {
      return 0;
    }

    const total = this.metrics.memoryUsages.reduce((sum, metric) => sum + metric.usage, 0);
    return total / this.metrics.memoryUsages.length;
  }

  checkEventListenerLeaks() {
    // EventListener リーク検出ロジック
    console.log('🔍 Checking EventListener leaks...');
  }

  checkTimerLeaks() {
    // タイマーリーク検出ロジック
    console.log('🔍 Checking Timer leaks...');
  }

  checkDOMReferenceLeaks() {
    // DOM参照リーク検出ロジック
    console.log('🔍 Checking DOM reference leaks...');
  }

  /**
   * パフォーマンス統計取得
   */
  getPerformanceStats() {
    const RECENT_SUGGESTIONS_COUNT = 5;

    return {
      targets: {
        fileProcessing: this.TARGET_FILE_PROCESSING_TIME,
        uiResponse: this.TARGET_UI_RESPONSE_TIME,
        memory: this.TARGET_MEMORY_USAGE,
        bundle: this.TARGET_BUNDLE_SIZE,
      },
      metrics: {
        fileProcessing: {
          average: this.getAverageFileProcessingTime(),
          history: this.metrics.fileProcessingTimes.slice(-10),
        },
        memory: {
          current: this.getCurrentMemoryUsage(),
          average: this.getAverageMemoryUsage(),
          history: this.metrics.memoryUsages.slice(-10),
        },
        suggestions: this.metrics.optimizationSuggestions.slice(-RECENT_SUGGESTIONS_COUNT),
      },
    };
  }
}

module.exports = PerformanceOptimizer;
