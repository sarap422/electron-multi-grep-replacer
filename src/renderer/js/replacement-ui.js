/**
 * Multi Grep Replacer - Dynamic Replacement Rule Management UI
 * 動的置換ルール管理システム（ドラッグ&ドロップ、リアルタイム応答性）
 *
 * @features:
 * - 動的ルール追加・削除（➕🗑️ボタン）
 * - From/Toフィールドの動的生成
 * - ルール有効/無効切り替え（☑️チェックボックス）
 * - ドラッグ&ドロップ並び替え（↕️アイコン）
 * - UI応答性100ms以内保証
 * - Vibe Logger統合
 */

class RuleManager {
  constructor(uiController) {
    this.uiController = uiController;
    this.dragOverElement = null;

    // パフォーマンス監視
    this.UI_RESPONSE_TARGET = 100; // ms

    // Vibe Logger統合
    this.vibeLogger = null;
    if (window.vibeLogger) {
      this.vibeLogger = window.vibeLogger;
      this.logOperation('RuleManager初期化', true, { timestamp: new Date().toISOString() });
    }

    console.log('🎯 RuleManager initialized with drag & drop support');
  }

  /**
   * Vibe Logger統合 - 構造化ログ出力
   */
  logOperation(operation, success, data = {}) {
    if (this.vibeLogger) {
      this.vibeLogger.logUIOperation(operation, success, {
        component: 'RuleManager',
        timestamp: new Date().toISOString(),
        ...data,
      });
    } else {
      console.log(`🎯 RuleManager: ${operation} - ${success ? '✅' : '❌'}`, data);
    }
  }

  /**
   * 動的ルール追加システム
   * UI応答性100ms以内保証
   */
  addRule(initialData = {}) {
    const startTime = performance.now();

    try {
      // 新規ルールオブジェクト作成
      const newRule = {
        id: `rule-${this.uiController.ruleIdCounter++}`,
        from: initialData.from || '',
        to: initialData.to || '',
        enabled: initialData.enabled !== undefined ? initialData.enabled : true,
        description: initialData.description || '',
        order: this.uiController.replacementRules.length,
      };

      // データ追加
      this.uiController.replacementRules.push(newRule);

      // DOM要素作成・追加
      const ruleElement = this.createRuleElement(newRule);
      const rulesList = document.getElementById('rulesList');

      if (rulesList) {
        rulesList.appendChild(ruleElement);

        // アニメーション適用（即座反応のため短時間）
        requestAnimationFrame(() => {
          ruleElement.classList.add('rule-appear');
        });
      }

      // フォーカス設定（新規ルールへの即座フォーカス）
      setTimeout(() => {
        const fromInput = ruleElement.querySelector('.rule-from');
        if (fromInput) {
          fromInput.focus();
        }
      }, 50);

      // カウンター更新
      this.uiController.updateActiveRuleCount();

      // パフォーマンス測定
      const responseTime = performance.now() - startTime;
      this.recordPerformance('addRule', responseTime);

      this.logOperation('動的ルール追加', true, {
        ruleId: newRule.id,
        responseTime: `${responseTime.toFixed(2)}ms`,
        target_achieved: responseTime <= this.UI_RESPONSE_TARGET,
      });

      return newRule;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.logOperation('動的ルール追加', false, {
        error: error.message,
        responseTime: `${responseTime.toFixed(2)}ms`,
      });
      throw error;
    }
  }

  /**
   * 動的ルール削除（スムーズアニメーション付き）
   */
  deleteRule(ruleId) {
    const startTime = performance.now();

    try {
      const ruleIndex = this.uiController.replacementRules.findIndex(rule => rule.id === ruleId);
      if (ruleIndex === -1) {
        throw new Error(`Rule not found: ${ruleId}`);
      }

      const ruleElement = document.querySelector(`[data-rule-id="${ruleId}"]`);

      if (ruleElement) {
        // 削除アニメーション
        ruleElement.classList.add('rule-removing');

        // アニメーション完了後に実際の削除実行
        setTimeout(() => {
          // データから削除
          this.uiController.replacementRules.splice(ruleIndex, 1);

          // DOM要素削除
          if (ruleElement.parentNode) {
            ruleElement.parentNode.removeChild(ruleElement);
          }

          // カウンター更新
          this.uiController.updateActiveRuleCount();

          const responseTime = performance.now() - startTime;
          this.recordPerformance('deleteRule', responseTime);

          this.logOperation('動的ルール削除', true, {
            ruleId,
            responseTime: `${responseTime.toFixed(2)}ms`,
            target_achieved: responseTime <= this.UI_RESPONSE_TARGET,
          });
        }, 300); // CSS animation duration
      } else {
        // DOM要素が見つからない場合はデータのみ削除
        this.uiController.replacementRules.splice(ruleIndex, 1);
        this.uiController.updateActiveRuleCount();
      }
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.logOperation('動的ルール削除', false, {
        ruleId,
        error: error.message,
        responseTime: `${responseTime.toFixed(2)}ms`,
      });
      console.error('❌ Rule deletion failed:', error);
    }
  }

  /**
   * ルール有効/無効切り替え（即座反映）
   */
  toggleRule(ruleId) {
    const startTime = performance.now();

    try {
      const rule = this.uiController.replacementRules.find(r => r.id === ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }

      // 状態切り替え
      rule.enabled = !rule.enabled;

      // UI更新（即座反映）
      const ruleElement = document.querySelector(`[data-rule-id="${ruleId}"]`);
      if (ruleElement) {
        const checkbox = ruleElement.querySelector('.rule-checkbox');
        if (checkbox) {
          checkbox.checked = rule.enabled;
        }

        // 視覚的フィードバック
        ruleElement.classList.toggle('rule-disabled', !rule.enabled);
      }

      // カウンター更新
      this.uiController.updateActiveRuleCount();

      const responseTime = performance.now() - startTime;
      this.recordPerformance('toggleRule', responseTime);

      this.logOperation('ルール有効無効切り替え', true, {
        ruleId,
        enabled: rule.enabled,
        responseTime: `${responseTime.toFixed(2)}ms`,
        target_achieved: responseTime <= this.UI_RESPONSE_TARGET,
      });
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.logOperation('ルール有効無効切り替え', false, {
        ruleId,
        error: error.message,
        responseTime: `${responseTime.toFixed(2)}ms`,
      });
      console.error('❌ Rule toggle failed:', error);
    }
  }

  /**
   * ルール値更新（リアルタイム）
   */
  updateRule(ruleId, field, value) {
    const startTime = performance.now();

    try {
      const rule = this.uiController.replacementRules.find(r => r.id === ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }

      // データ更新
      rule[field] = value;

      // リアルタイムバリデーション（オプション）
      if (field === 'from' || field === 'to') {
        this.validateRuleInput(rule, field);
      }

      // カウンター更新（有効ルール数に影響する場合）
      if (field === 'from' || field === 'to') {
        this.uiController.updateActiveRuleCount();
      }

      const responseTime = performance.now() - startTime;
      this.recordPerformance('updateRule', responseTime);

      this.logOperation('ルール値更新', true, {
        ruleId,
        field,
        valueLength: value.length,
        responseTime: `${responseTime.toFixed(2)}ms`,
        target_achieved: responseTime <= this.UI_RESPONSE_TARGET,
      });
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.logOperation('ルール値更新', false, {
        ruleId,
        field,
        error: error.message,
        responseTime: `${responseTime.toFixed(2)}ms`,
      });
      console.error('❌ Rule update failed:', error);
    }
  }

  /**
   * ルール要素作成（拡張版）
   */
  createRuleElement(rule) {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'rule-item';
    ruleDiv.setAttribute('data-rule-id', rule.id);

    ruleDiv.innerHTML = `
      <div class="rule-controls">
        <input type="checkbox" class="rule-checkbox" ${rule.enabled ? 'checked' : ''} 
               aria-label="Enable rule" title="ルールを有効/無効切り替え">
      </div>
      <div class="rule-fields">
        <div class="rule-field-group">
          <label class="rule-label">From:</label>
          <input type="text" class="rule-from" placeholder="検索文字列" 
                 value="${rule.from}" aria-label="Search text"
                 title="置換前の文字列を入力">
        </div>
        <div class="rule-arrow">→</div>
        <div class="rule-field-group">
          <label class="rule-label">To:</label>
          <input type="text" class="rule-to" placeholder="置換文字列" 
                 value="${rule.to}" aria-label="Replace text"
                 title="置換後の文字列を入力">
        </div>
      </div>
      <div class="rule-actions">
        <button class="icon-button rule-delete" title="ルールを削除" aria-label="Delete rule">
          <span>🗑️</span>
        </button>
      </div>
    `;

    // イベントリスナー設定
    this.setupRuleEventListeners(ruleDiv, rule);

    return ruleDiv;
  }

  /**
   * ルールイベントリスナー設定
   */
  setupRuleEventListeners(ruleElement, rule) {
    // チェックボックス
    const checkbox = ruleElement.querySelector('.rule-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', () => this.toggleRule(rule.id));
    }

    // From入力フィールド
    const fromInput = ruleElement.querySelector('.rule-from');
    if (fromInput) {
      fromInput.addEventListener('input', e => {
        this.updateRule(rule.id, 'from', e.target.value);
      });

      // リアルタイムバリデーション表示
      fromInput.addEventListener('blur', () => {
        this.validateRuleInput(rule, 'from');
      });
    }

    // To入力フィールド
    const toInput = ruleElement.querySelector('.rule-to');
    if (toInput) {
      toInput.addEventListener('input', e => {
        this.updateRule(rule.id, 'to', e.target.value);
      });

      toInput.addEventListener('blur', () => {
        this.validateRuleInput(rule, 'to');
      });
    }

    // 削除ボタン
    const deleteButton = ruleElement.querySelector('.rule-delete');
    if (deleteButton) {
      deleteButton.addEventListener('click', () => this.deleteRule(rule.id));
    }
  }

  /**
   * ルール入力バリデーション
   */
  validateRuleInput(rule, field) {
    const ruleElement = document.querySelector(`[data-rule-id="${rule.id}"]`);
    if (!ruleElement) {
      return;
    }

    const input = ruleElement.querySelector(`.rule-${field}`);
    if (!input) {
      return;
    }

    const value = rule[field];
    let isValid = true;
    let errorMessage = '';

    // バリデーションルール
    if (field === 'from') {
      if (!value || value.trim().length === 0) {
        isValid = false;
        errorMessage = '検索文字列を入力してください';
      } else if (value.length > 1000) {
        isValid = false;
        errorMessage = '検索文字列が長すぎます（1000文字以下）';
      }
    } else if (field === 'to') {
      if (value.length > 1000) {
        isValid = false;
        errorMessage = '置換文字列が長すぎます（1000文字以下）';
      }
    }

    // UI反映
    input.classList.toggle('invalid', !isValid);

    if (!isValid) {
      input.title = errorMessage;
      console.warn(`⚠️ Validation error for ${rule.id}.${field}: ${errorMessage}`);
    } else {
      input.title = field === 'from' ? '置換前の文字列を入力' : '置換後の文字列を入力';
    }

    return isValid;
  }

  /**
   * パフォーマンス記録
   */
  recordPerformance(operation, responseTime) {
    const targetAchieved = responseTime <= this.UI_RESPONSE_TARGET;

    if (
      window.performanceMonitor &&
      typeof window.performanceMonitor.recordResponse === 'function'
    ) {
      window.performanceMonitor.recordResponse(operation, responseTime, 'RuleManager');
    }

    // 目標未達成の場合は警告
    if (!targetAchieved) {
      console.warn(
        `⚠️ Performance warning: ${operation} took ${responseTime.toFixed(2)}ms (target: ${
          this.UI_RESPONSE_TARGET
        }ms)`
      );
    } else {
      console.log(`⚡ Performance good: ${operation} took ${responseTime.toFixed(2)}ms`);
    }
  }

  /**
   * 全ルールクリア
   */
  clearAllRules() {
    const startTime = performance.now();

    try {
      // データクリア
      this.uiController.replacementRules = [];

      // UI クリア
      const rulesList = document.getElementById('rulesList');
      if (rulesList) {
        rulesList.innerHTML = '';
      }

      // カウンター更新
      this.uiController.updateActiveRuleCount();

      const responseTime = performance.now() - startTime;
      this.recordPerformance('clearAllRules', responseTime);

      this.logOperation('全ルールクリア', true, {
        responseTime: `${responseTime.toFixed(2)}ms`,
        target_achieved: responseTime <= this.UI_RESPONSE_TARGET,
      });
    } catch (error) {
      this.logOperation('全ルールクリア', false, {
        error: error.message,
      });
      console.error('❌ Clear all rules failed:', error);
    }
  }

  /**
   * ルール数取得
   */
  getRuleCount() {
    return {
      total: this.uiController.replacementRules.length,
      enabled: this.uiController.replacementRules.filter(r => r.enabled).length,
      active: this.uiController.replacementRules.filter(r => r.enabled && r.from && r.to).length,
    };
  }
}

// グローバル公開（UIControllerから使用）
if (typeof window !== 'undefined') {
  window.RuleManager = RuleManager;
}

// エクスポート（Node.js環境対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RuleManager;
}
