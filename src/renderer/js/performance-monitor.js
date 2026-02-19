/**
 * Multi Grep Replacer - Performance Monitor
 * UI応答性監視・パフォーマンス分析・最適化提案
 */

class PerformanceMonitor {
  constructor() {
    // パフォーマンス目標値
    this.UI_RESPONSE_TARGET = 100; // ms - Python版課題の根本解決目標
    this.EXCELLENT_THRESHOLD = 50; // ms - 優秀判定しきい値
    this.WARNING_THRESHOLD = 150; // ms - 警告しきい値
    this.CRITICAL_THRESHOLD = 300; // ms - 重大問題しきい値

    // 監視データ
    this.responseHistory = [];
    this.actionStats = new Map();
    this.performanceReports = [];
    this.isMonitoring = true;

    // DOM要素キャッシュ
    this.responseTimeElement = null;
    this.responseStatusElement = null;
    this.performanceMonitorElement = null;

    console.log('📊 Performance Monitor initializing...');
    this.initialize();
  }

  /**
   * パフォーマンス監視初期化
   */
  initialize() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupMonitoring());
    } else {
      this.setupMonitoring();
    }
  }

  /**
   * 監視設定
   */
  setupMonitoring() {
    console.log('📊 Setting up performance monitoring...');

    // DOM要素キャッシュ
    this.cacheElements();

    // 基本監視設定
    this.setupBasicMonitoring();

    // インタラクション監視
    this.setupInteractionMonitoring();

    // メモリ監視
    this.setupMemoryMonitoring();

    // 定期レポート
    this.setupPeriodicReporting();

    // 初期表示更新
    this.updateDisplay();

    console.log('✅ Performance monitoring setup completed');
  }

  /**
   * DOM要素キャッシュ
   */
  cacheElements() {
    this.responseTimeElement = document.getElementById('responseTime');
    this.responseStatusElement = document.getElementById('responseStatus');
    this.performanceMonitorElement = document.getElementById('performanceMonitor');
  }

  /**
   * 基本監視設定
   */
  setupBasicMonitoring() {
    // フレームレート監視
    this.startFrameRateMonitoring();

    // ページ読み込み時間監視
    this.monitorPageLoadTime();

    // エラー監視
    this.setupErrorMonitoring();

    // リソース監視
    this.setupResourceMonitoring();
  }

  /**
   * インタラクション監視設定
   */
  setupInteractionMonitoring() {
    // すべてのボタンを監視
    document.querySelectorAll('button').forEach(button => {
      this.monitorButtonResponse(button);
    });

    // 入力フィールド監視
    document.querySelectorAll('input, textarea, select').forEach(input => {
      this.monitorInputResponse(input);
    });

    // ドラッグ&ドロップ監視
    this.setupDragDropMonitoring();

    // スクロール監視
    this.setupScrollMonitoring();
  }

  /**
   * ボタン応答性監視
   */
  monitorButtonResponse(buttonElement) {
    if (!buttonElement) {
      return;
    }

    const actionName = this.getActionName(buttonElement);

    buttonElement.addEventListener('click', _event => {
      const startTime = performance.now();

      // 次のフレームで応答時間測定
      requestAnimationFrame(() => {
        const responseTime = performance.now() - startTime;
        this.recordResponse(actionName, responseTime, 'button');

        // 即座に視覚フィードバック
        this.updateDisplay();

        // 問題がある場合は警告
        if (responseTime > this.UI_RESPONSE_TARGET) {
          this.handleSlowResponse(actionName, responseTime, buttonElement);
        }
      });
    });
  }

  /**
   * 入力フィールド応答性監視
   */
  monitorInputResponse(inputElement) {
    if (!inputElement) {
      return;
    }

    const fieldName = this.getFieldName(inputElement);
    let inputStartTime;

    inputElement.addEventListener('input', _event => {
      if (!inputStartTime) {
        inputStartTime = performance.now();
      }

      // デバウンス処理で最終入力を検出
      clearTimeout(inputElement._inputTimeout);
      inputElement._inputTimeout = setTimeout(() => {
        const responseTime = performance.now() - inputStartTime;
        this.recordResponse(fieldName, responseTime, 'input');

        if (responseTime > this.UI_RESPONSE_TARGET) {
          this.handleSlowResponse(fieldName, responseTime, inputElement);
        }

        inputStartTime = null;
      }, 100);
    });

    // キー入力の即時応答性監視
    inputElement.addEventListener('keydown', _event => {
      const keyStartTime = performance.now();

      requestAnimationFrame(() => {
        const keyResponseTime = performance.now() - keyStartTime;

        if (keyResponseTime > 16) {
          // 60fps基準
          console.warn(`⚠️ Slow key response: ${fieldName} (${keyResponseTime.toFixed(2)}ms)`);
        }
      });
    });
  }

  /**
   * 応答記録
   */
  recordResponse(actionName, responseTime, type = 'unknown') {
    const record = {
      action: actionName,
      responseTime,
      type,
      timestamp: Date.now(),
      rating: this.getRating(responseTime),
      session: this.getCurrentSession(),
    };

    // 履歴に追加
    this.responseHistory.push(record);

    // 統計更新
    this.updateActionStats(actionName, responseTime);

    // 履歴サイズ制限
    if (this.responseHistory.length > 1000) {
      this.responseHistory = this.responseHistory.slice(-500);
    }

    // 最新の応答時間を表示
    this.updateResponseTimeDisplay(responseTime);

    console.log(
      `📊 Response recorded: ${actionName} (${responseTime.toFixed(2)}ms) - ${record.rating}`
    );
  }

  /**
   * パフォーマンス評価
   */
  getRating(responseTime) {
    if (responseTime <= this.EXCELLENT_THRESHOLD) {
      return 'excellent';
    } else if (responseTime <= this.UI_RESPONSE_TARGET) {
      return 'good';
    } else if (responseTime <= this.WARNING_THRESHOLD) {
      return 'warning';
    } else if (responseTime <= this.CRITICAL_THRESHOLD) {
      return 'poor';
    } else {
      return 'critical';
    }
  }

  /**
   * 遅延応答処理
   */
  handleSlowResponse(actionName, responseTime, element) {
    console.warn(`⚠️ Slow UI response detected: ${actionName} (${responseTime.toFixed(2)}ms)`);

    // 警告通知表示
    this.showPerformanceWarning(actionName, responseTime);

    // 要素にパフォーマンス警告クラスを追加
    if (element) {
      element.classList.add('performance-warning');
      setTimeout(() => {
        element.classList.remove('performance-warning');
      }, 2000);
    }

    // 改善提案生成
    this.generateOptimizationSuggestion(actionName, responseTime);
  }

  /**
   * パフォーマンス警告表示
   */
  showPerformanceWarning(actionName, responseTime) {
    const warningElement = document.createElement('div');
    warningElement.className = 'performance-warning slide-in-right';
    warningElement.innerHTML = `
      <div class="warning-header">
        <span class="warning-icon">⚠️</span>
        <span class="warning-title">UI応答性低下検出</span>
      </div>
      <div class="warning-details">
        <div>アクション: ${actionName}</div>
        <div>応答時間: ${responseTime.toFixed(2)}ms</div>
        <div>目標値: ${this.UI_RESPONSE_TARGET}ms以内</div>
      </div>
      <div class="warning-suggestion">
        ${this.getQuickFix(responseTime)}
      </div>
    `;

    document.body.appendChild(warningElement);

    // 自動削除
    setTimeout(() => {
      warningElement.classList.add('fade-out');
      setTimeout(() => {
        if (warningElement.parentNode) {
          warningElement.parentNode.removeChild(warningElement);
        }
      }, 300);
    }, 4000);
  }

  /**
   * 表示更新
   */
  updateDisplay() {
    if (this.responseHistory.length === 0) {
      return;
    }

    const latestResponse = this.responseHistory[this.responseHistory.length - 1];
    this.updateResponseTimeDisplay(latestResponse.responseTime);
    this.updateStatusDisplay();
  }

  /**
   * 応答時間表示更新
   */
  updateResponseTimeDisplay(responseTime) {
    if (!this.responseTimeElement) {
      return;
    }

    this.responseTimeElement.textContent = `${responseTime.toFixed(2)}ms`;

    // CSSクラス更新
    const rating = this.getRating(responseTime);
    this.responseTimeElement.className = `response-time ${rating}`;

    // パフォーマンス監視要素の更新
    if (this.performanceMonitorElement) {
      this.performanceMonitorElement.className = `performance-monitor ${rating}`;
    }
  }

  /**
   * ステータス表示更新
   */
  updateStatusDisplay() {
    if (!this.responseStatusElement) {
      return;
    }

    const recentResponses = this.responseHistory.slice(-10);
    const averageResponse =
      recentResponses.reduce((sum, r) => sum + r.responseTime, 0) / recentResponses.length;

    let statusText = '✅ Good';
    let statusClass = 'good';

    if (averageResponse > this.CRITICAL_THRESHOLD) {
      statusText = '🚨 Critical';
      statusClass = 'critical';
    } else if (averageResponse > this.WARNING_THRESHOLD) {
      statusText = '⚠️ Warning';
      statusClass = 'warning';
    } else if (averageResponse > this.UI_RESPONSE_TARGET) {
      statusText = '🟡 Attention';
      statusClass = 'attention';
    } else if (averageResponse <= this.EXCELLENT_THRESHOLD) {
      statusText = '🌟 Excellent';
      statusClass = 'excellent';
    }

    this.responseStatusElement.innerHTML = statusText;
    this.responseStatusElement.className = `response-status ${statusClass}`;
  }

  /**
   * アクション統計更新
   */
  updateActionStats(actionName, responseTime) {
    if (!this.actionStats.has(actionName)) {
      this.actionStats.set(actionName, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: -Infinity,
        slowCount: 0,
      });
    }

    const stats = this.actionStats.get(actionName);
    stats.count++;
    stats.totalTime += responseTime;
    stats.minTime = Math.min(stats.minTime, responseTime);
    stats.maxTime = Math.max(stats.maxTime, responseTime);

    if (responseTime > this.UI_RESPONSE_TARGET) {
      stats.slowCount++;
    }

    stats.averageTime = stats.totalTime / stats.count;
    stats.slowRate = (stats.slowCount / stats.count) * 100;
  }

  /**
   * フレームレート監視
   */
  startFrameRateMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();
    const fpsHistory = [];

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        fpsHistory.push(fps);

        if (fpsHistory.length > 10) {
          fpsHistory.shift();
        }

        const averageFPS = fpsHistory.reduce((sum, f) => sum + f, 0) / fpsHistory.length;

        if (averageFPS < 30) {
          console.warn(`⚠️ Low frame rate detected: ${averageFPS.toFixed(1)} FPS`);
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      if (this.isMonitoring) {
        requestAnimationFrame(measureFPS);
      }
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * メモリ監視設定
   */
  setupMemoryMonitoring() {
    if (!performance.memory) {
      return;
    }

    setInterval(() => {
      const { memory } = performance;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      // const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024); // 将来の機能拡張用
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);

      // メモリ使用量が80%を超えた場合警告
      if (usedMB / limitMB > 0.8) {
        console.warn(
          `⚠️ High memory usage: ${usedMB}MB / ${limitMB}MB (${Math.round(
            (usedMB / limitMB) * 100
          )}%)`
        );
        this.reportMemoryIssue(usedMB, limitMB);
      }

      // メモリリーク検出
      this.detectMemoryLeaks();
    }, 10000); // 10秒間隔
  }

  /**
   * エラー監視設定
   */
  setupErrorMonitoring() {
    window.addEventListener('error', event => {
      console.error('❌ JavaScript Error:', event.error);
      this.recordError('javascript', event.error.message, event.error.stack);
    });

    window.addEventListener('unhandledrejection', event => {
      console.error('❌ Unhandled Promise Rejection:', event.reason);
      this.recordError('promise', event.reason, '');
    });
  }

  /**
   * ドラッグ&ドロップ監視設定
   */
  setupDragDropMonitoring() {
    let dragStartTime;

    document.addEventListener('dragstart', () => {
      dragStartTime = performance.now();
    });

    document.addEventListener('drop', () => {
      if (dragStartTime) {
        const dragTime = performance.now() - dragStartTime;
        this.recordResponse('dragDrop', dragTime, 'interaction');
        dragStartTime = null;
      }
    });
  }

  /**
   * スクロール監視設定
   */
  setupScrollMonitoring() {
    let scrollStartTime;
    let isScrolling = false;

    document.addEventListener('scroll', () => {
      if (!isScrolling) {
        scrollStartTime = performance.now();
        isScrolling = true;
      }
    });

    // スクロール終了検出
    let scrollTimeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (isScrolling && scrollStartTime) {
          const scrollTime = performance.now() - scrollStartTime;
          this.recordResponse('scroll', scrollTime, 'interaction');
          isScrolling = false;
        }
      }, 100);
    });
  }

  /**
   * パフォーマンスレポート生成
   */
  generatePerformanceReport() {
    const report = {
      timestamp: Date.now(),
      session: this.getCurrentSession(),
      summary: this.generateSummary(),
      actionStats: Object.fromEntries(this.actionStats),
      recommendations: this.generateRecommendations(),
      systemInfo: this.getSystemInfo(),
    };

    this.performanceReports.push(report);
    return report;
  }

  /**
   * サマリー生成
   */
  generateSummary() {
    if (this.responseHistory.length === 0) {
      return { message: 'No performance data available' };
    }

    const responses = this.responseHistory;
    const totalResponses = responses.length;
    const averageResponse = responses.reduce((sum, r) => sum + r.responseTime, 0) / totalResponses;
    const slowResponses = responses.filter(r => r.responseTime > this.UI_RESPONSE_TARGET).length;
    const excellentResponses = responses.filter(
      r => r.responseTime <= this.EXCELLENT_THRESHOLD
    ).length;

    return {
      totalActions: totalResponses,
      averageResponseTime: Math.round(averageResponse * 100) / 100,
      targetAchievementRate: Math.round(((totalResponses - slowResponses) / totalResponses) * 100),
      excellenceRate: Math.round((excellentResponses / totalResponses) * 100),
      slowResponseCount: slowResponses,
      overallRating: this.getRating(averageResponse),
    };
  }

  /**
   * 改善提案生成
   */
  generateRecommendations() {
    const recommendations = [];
    const summary = this.generateSummary();

    if (summary.targetAchievementRate < 90) {
      recommendations.push({
        priority: 'high',
        category: 'ui-responsiveness',
        title: 'UI応答性の改善が必要',
        description: `目標達成率が${summary.targetAchievementRate}%と低下しています`,
        actions: [
          '重いDOM操作を非同期化する',
          'requestAnimationFrameを活用する',
          'イベントハンドラーを最適化する',
        ],
      });
    }

    if (summary.averageResponseTime > this.WARNING_THRESHOLD) {
      recommendations.push({
        priority: 'critical',
        category: 'performance',
        title: '深刻なパフォーマンス問題',
        description: `平均応答時間が${summary.averageResponseTime}msと非常に遅い`,
        actions: [
          'メモリリークの調査',
          '不要なイベントリスナーの削除',
          'CPUプロファイリングの実行',
        ],
      });
    }

    return recommendations;
  }

  /**
   * 定期レポート設定
   */
  setupPeriodicReporting() {
    // 5分間隔でレポート生成
    setInterval(() => {
      if (this.responseHistory.length > 0) {
        const report = this.generatePerformanceReport();
        console.log('📊 Performance Report:', report.summary);

        // 問題がある場合は通知
        if (report.summary.targetAchievementRate < 90) {
          this.notifyPerformanceIssue(report);
        }
      }
    }, 300000); // 5分
  }

  /**
   * ユーティリティメソッド
   */
  getActionName(element) {
    return (
      element.id ||
      element.textContent?.trim() ||
      element.className.split(' ')[0] ||
      element.tagName.toLowerCase()
    );
  }

  getFieldName(element) {
    return element.id || element.name || element.placeholder || 'input-field';
  }

  getCurrentSession() {
    return `session-${Date.now()}`;
  }

  getQuickFix(responseTime) {
    if (responseTime > this.CRITICAL_THRESHOLD) {
      return '深刻な問題です。ページの再読み込みを試してください。';
    } else if (responseTime > this.WARNING_THRESHOLD) {
      return '応答性が低下しています。他のタブを閉じることを検討してください。';
    } else {
      return '軽微な遅延が検出されました。問題は自動的に改善される可能性があります。';
    }
  }

  getSystemInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
      },
      memory: performance.memory
        ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
          }
        : null,
    };
  }

  /**
   * 外部API - 応答時間記録（UI Controllerから使用）
   */
  recordResponseTime(actionName, responseTime) {
    this.recordResponse(actionName, responseTime, 'external');
  }

  /**
   * 外部API - 統計取得
   */
  getStats() {
    return {
      summary: this.generateSummary(),
      actionStats: Object.fromEntries(this.actionStats),
      recentHistory: this.responseHistory.slice(-20),
    };
  }

  /**
   * 外部API - 監視停止/開始
   */
  setMonitoring(enabled) {
    this.isMonitoring = enabled;
    console.log(`📊 Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 外部API - レポート取得
   */
  getLatestReport() {
    return this.generatePerformanceReport();
  }
}

// DOM読み込み完了後にPerformanceMonitor初期化
document.addEventListener('DOMContentLoaded', () => {
  window.performanceMonitor = new PerformanceMonitor();
  console.log('📊 Performance Monitor initialized');
});
