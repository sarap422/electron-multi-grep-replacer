/**
 * Multi Grep Replacer - Template & Configuration Management System
 * テンプレート・設定管理システム（履歴・テンプレート・プリセット）
 *
 * @features:
 * - 設定テンプレート管理（📋 Templates ▼）
 * - 最近使用した設定履歴
 * - プリセット設定（Web開発、CSS、JavaScript等）
 * - 設定保存・読み込み強化
 * - UI応答性100ms以内保証
 * - Vibe Logger統合
 */

class TemplateManager {
  constructor(uiController) {
    this.uiController = uiController;
    this.templates = new Map();
    this.recentConfigs = [];
    this.maxRecentConfigs = 10;

    // パフォーマンス監視
    this.UI_RESPONSE_TARGET = 100; // ms

    // Vibe Logger統合
    this.vibeLogger = null;
    if (window.vibeLogger) {
      this.vibeLogger = window.vibeLogger;
      this.logOperation('TemplateManager初期化', true, { timestamp: new Date().toISOString() });
    }

    // 初期化
    this.loadBuiltInTemplates();
    this.loadRecentConfigs();
    this.setupUI();

    console.log('📋 TemplateManager initialized with built-in templates');
  }

  /**
   * Vibe Logger統合 - 構造化ログ出力
   */
  logOperation(operation, success, data = {}) {
    if (this.vibeLogger) {
      this.vibeLogger.logUIOperation(operation, success, {
        component: 'TemplateManager',
        timestamp: new Date().toISOString(),
        ...data,
      });
    } else {
      console.log(`📋 TemplateManager: ${operation} - ${success ? '✅' : '❌'}`, data);
    }
  }

  /**
   * 組み込みテンプレート読み込み
   */
  loadBuiltInTemplates() {
    const builtInTemplates = [
      {
        id: 'web-development',
        name: 'Web開発用',
        description: 'HTML、CSS、JavaScript開発でよく使用する置換パターン',
        icon: '🌐',
        rules: [
          { from: 'class="old-btn"', to: 'class="btn btn-primary"', enabled: true },
          { from: 'var ', to: 'const ', enabled: true },
          { from: 'http://', to: 'https://', enabled: true },
        ],
        extensions: '.html,.shtml,.css,.scss,.js,.jsx,.tsx,.vue,.php',
        category: 'development',
      },
      {
        id: 'css-modernization',
        name: 'CSS モダン化',
        description: 'CSS プロパティとセレクターのモダン化',
        icon: '🎨',
        rules: [
          { from: 'display: -webkit-box;', to: 'display: flex;', enabled: true },
          { from: 'float: left;', to: 'display: flex;', enabled: true },
          { from: 'box-shadow: inset', to: 'box-shadow:', enabled: false },
        ],
        extensions: '.css,.scss,.sass,.less',
        category: 'styling',
      },
      {
        id: 'variable-rename',
        name: '変数名変更',
        description: 'JavaScript/TypeScript変数名の一括リファクタリング',
        icon: '📝',
        rules: [
          { from: 'oldVariableName', to: 'newVariableName', enabled: true },
          { from: 'OldClassName', to: 'NewClassName', enabled: true },
        ],
        extensions: '.js,.ts,.jsx,.tsx',
        category: 'refactoring',
      },
      {
        id: 'framework-migration',
        name: 'フレームワーク移行',
        description: 'Bootstrap 4→5、jQuery→Vanilla JS等',
        icon: '🔄',
        rules: [
          { from: 'data-toggle=', to: 'data-bs-toggle=', enabled: true },
          { from: 'data-target=', to: 'data-bs-target=', enabled: true },
          {
            from: '$(document).ready(',
            to: 'document.addEventListener("DOMContentLoaded", ',
            enabled: true,
          },
        ],
        extensions: '.html,.js,.php',
        category: 'migration',
      },
      {
        id: 'api-endpoint-update',
        name: 'API エンドポイント更新',
        description: 'API URLの一括変更（v1→v2等）',
        icon: '🔗',
        rules: [
          { from: '/api/v1/', to: '/api/v2/', enabled: true },
          { from: 'apiVersion: "1"', to: 'apiVersion: "2"', enabled: true },
        ],
        extensions: '.js,.ts,.json,.php,.py',
        category: 'api',
      },
      {
        id: 'text-cleanup',
        name: 'テキスト整理',
        description: '文書の整理・統一（全角半角、改行等）',
        icon: '📄',
        rules: [
          { from: '　', to: ' ', enabled: true }, // 全角→半角スペース
          { from: '\r\n', to: '\n', enabled: true }, // 改行統一
          { from: '！', to: '!', enabled: false }, // 全角→半角感嘆符
        ],
        extensions: '.txt,.md,.doc,.docx',
        category: 'text',
      },
    ];

    builtInTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    this.logOperation('組み込みテンプレート読み込み', true, {
      templateCount: builtInTemplates.length,
      categories: [...new Set(builtInTemplates.map(t => t.category))],
    });
  }

  /**
   * 最近の設定履歴読み込み
   */
  async loadRecentConfigs() {
    try {
      if (window.electronAPI && window.electronAPI.getRecentConfigs) {
        const result = await window.electronAPI.getRecentConfigs();
        if (result.success) {
          this.recentConfigs = result.configs || [];
        }
      } else {
        // フォールバック: localStorage使用
        const stored = localStorage.getItem('mgr-recent-configs');
        if (stored) {
          this.recentConfigs = JSON.parse(stored);
        }
      }

      this.logOperation('最近の設定履歴読み込み', true, {
        configCount: this.recentConfigs.length,
      });
    } catch (error) {
      this.logOperation('最近の設定履歴読み込み', false, {
        error: error.message,
      });
      console.warn('⚠️ Failed to load recent configs:', error);
      this.recentConfigs = [];
    }
  }

  /**
   * UI設定
   */
  setupUI() {
    this.setupTemplateSelect();
    this.setupRecentConfigsUI();
    this.setupQuickTemplateButtons();
  }

  /**
   * テンプレート選択UI設定
   */
  setupTemplateSelect() {
    const templateSelect = document.getElementById('templateSelect');
    if (!templateSelect) {
      console.warn('⚠️ Template select element not found');
      return;
    }

    // オプションクリア
    templateSelect.innerHTML = '<option value="">テンプレートを選択...</option>';

    // カテゴリ別グループ化
    const categories = {
      development: { name: '開発', templates: [] },
      styling: { name: 'スタイリング', templates: [] },
      refactoring: { name: 'リファクタリング', templates: [] },
      migration: { name: '移行', templates: [] },
      api: { name: 'API', templates: [] },
      text: { name: 'テキスト処理', templates: [] },
      custom: { name: 'カスタム', templates: [] },
    };

    // テンプレートを分類
    this.templates.forEach(template => {
      const category = template.category || 'custom';
      if (categories[category]) {
        categories[category].templates.push(template);
      }
    });

    // カテゴリ別にオプション追加
    Object.entries(categories).forEach(([_categoryKey, categoryData]) => {
      if (categoryData.templates.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = categoryData.name;

        categoryData.templates.forEach(template => {
          const option = document.createElement('option');
          option.value = template.id;
          option.textContent = `${template.icon || '📋'} ${template.name}`;
          option.title = template.description;
          optgroup.appendChild(option);
        });

        templateSelect.appendChild(optgroup);
      }
    });

    // イベントリスナー設定
    templateSelect.addEventListener('change', () => {
      this.handleTemplateSelect();
    });

    console.log('📋 Template select UI setup completed');
  }

  /**
   * 最近の設定UI設定
   */
  setupRecentConfigsUI() {
    const recentConfigsList = document.getElementById('recentConfigsList');
    if (!recentConfigsList) {
      return;
    }

    recentConfigsList.innerHTML = '';

    if (this.recentConfigs.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'recent-config-empty';
      emptyMessage.textContent = '最近の設定はありません';
      recentConfigsList.appendChild(emptyMessage);
      return;
    }

    this.recentConfigs.slice(0, 5).forEach((config, index) => {
      const configItem = document.createElement('div');
      configItem.className = 'recent-config-item';
      configItem.innerHTML = `
        <div class="recent-config-info">
          <div class="recent-config-name">${config.name || `設定 ${index + 1}`}</div>
          <div class="recent-config-date">${this.formatDate(config.timestamp)}</div>
          <div class="recent-config-summary">${this.getConfigSummary(config)}</div>
        </div>
        <button class="recent-config-load" data-config-index="${index}" 
                title="この設定を読み込み">
          <span>📂</span>
        </button>
      `;

      // 読み込みボタンのイベントリスナー
      const loadButton = configItem.querySelector('.recent-config-load');
      loadButton.addEventListener('click', () => {
        this.loadRecentConfig(index);
      });

      recentConfigsList.appendChild(configItem);
    });
  }

  /**
   * クイックテンプレートボタン設定
   */
  setupQuickTemplateButtons() {
    const quickTemplatesContainer = document.getElementById('quickTemplates');
    if (!quickTemplatesContainer) {
      return;
    }

    // よく使用されるテンプレートのクイックボタン
    const popularTemplates = ['web-development', 'css-modernization', 'variable-rename'];

    quickTemplatesContainer.innerHTML = '';

    popularTemplates.forEach(templateId => {
      const template = this.templates.get(templateId);
      if (!template) {
        return;
      }

      const button = document.createElement('button');
      button.className = 'quick-template-btn';
      button.innerHTML = `${template.icon} ${template.name}`;
      button.title = template.description;
      button.addEventListener('click', () => {
        this.applyTemplate(templateId);
      });

      quickTemplatesContainer.appendChild(button);
    });
  }

  /**
   * テンプレート選択処理
   */
  async handleTemplateSelect() {
    const startTime = performance.now();
    const templateSelect = document.getElementById('templateSelect');

    if (!templateSelect || !templateSelect.value) {
      return;
    }

    try {
      await this.applyTemplate(templateSelect.value);

      // 選択をリセット
      templateSelect.value = '';

      const responseTime = performance.now() - startTime;
      this.recordPerformance('templateSelect', responseTime);
    } catch (error) {
      this.logOperation('テンプレート選択', false, {
        templateId: templateSelect.value,
        error: error.message,
      });
      console.error('❌ Template selection failed:', error);
    }
  }

  /**
   * テンプレート適用
   */
  async applyTemplate(templateId) {
    const startTime = performance.now();

    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // 既存のルールをクリア（確認付き）
      if (this.uiController.replacementRules.length > 0) {
        const confirmed = await this.confirmClearRules();
        if (!confirmed) {
          return;
        }
      }

      // ルールクリア
      if (this.uiController.ruleManager) {
        this.uiController.ruleManager.clearAllRules();
      }

      // 新規ルール追加
      template.rules.forEach(rule => {
        const newRule = {
          from: rule.from,
          to: rule.to,
          enabled: rule.enabled !== false,
          description: rule.description || '',
        };

        if (this.uiController.ruleManager) {
          this.uiController.ruleManager.addRule(newRule);
        }
      });

      // ファイル拡張子設定
      if (template.extensions) {
        const fileExtensionsInput = document.getElementById('fileExtensions');
        if (fileExtensionsInput) {
          fileExtensionsInput.value = template.extensions;
        }
      }

      // プレビュー更新
      await this.uiController.updatePreview();

      const responseTime = performance.now() - startTime;
      this.recordPerformance('applyTemplate', responseTime);

      this.logOperation('テンプレート適用', true, {
        templateId,
        templateName: template.name,
        rulesCount: template.rules.length,
        responseTime: `${responseTime.toFixed(2)}ms`,
        target_achieved: responseTime <= this.UI_RESPONSE_TARGET,
      });

      // 成功メッセージ
      if (this.uiController.showSuccess) {
        this.uiController.showSuccess(
          'テンプレート適用完了',
          `"${template.name}" テンプレートを適用しました`
        );
      }
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.logOperation('テンプレート適用', false, {
        templateId,
        error: error.message,
        responseTime: `${responseTime.toFixed(2)}ms`,
      });

      if (this.uiController.showError) {
        this.uiController.showError('テンプレート適用失敗', error.message);
      }
    }
  }

  /**
   * 最近の設定読み込み
   */
  async loadRecentConfig(index) {
    const startTime = performance.now();

    try {
      const config = this.recentConfigs[index];
      if (!config) {
        throw new Error(`Recent config not found at index: ${index}`);
      }

      // 設定適用
      this.uiController.loadConfigData(config);

      const responseTime = performance.now() - startTime;
      this.recordPerformance('loadRecentConfig', responseTime);

      this.logOperation('最近の設定読み込み', true, {
        configIndex: index,
        configName: config.name || `設定 ${index + 1}`,
        responseTime: `${responseTime.toFixed(2)}ms`,
        target_achieved: responseTime <= this.UI_RESPONSE_TARGET,
      });

      if (this.uiController.showSuccess) {
        this.uiController.showSuccess('設定読み込み完了', '最近の設定を読み込みました');
      }
    } catch (error) {
      this.logOperation('最近の設定読み込み', false, {
        configIndex: index,
        error: error.message,
      });

      if (this.uiController.showError) {
        this.uiController.showError('設定読み込み失敗', error.message);
      }
    }
  }

  /**
   * 設定を履歴に追加
   */
  async addToRecentConfigs(config) {
    try {
      // タイムスタンプ追加
      const configWithTimestamp = {
        ...config,
        timestamp: new Date().toISOString(),
        name: config.app_info?.name || '無題の設定',
      };

      // 重複除去（同じ設定名があれば上書き）
      this.recentConfigs = this.recentConfigs.filter(c => c.name !== configWithTimestamp.name);

      // 先頭に追加
      this.recentConfigs.unshift(configWithTimestamp);

      // 最大数制限
      if (this.recentConfigs.length > this.maxRecentConfigs) {
        this.recentConfigs = this.recentConfigs.slice(0, this.maxRecentConfigs);
      }

      // 保存
      await this.saveRecentConfigs();

      // UI更新
      this.setupRecentConfigsUI();

      this.logOperation('設定履歴追加', true, {
        configName: configWithTimestamp.name,
        totalConfigs: this.recentConfigs.length,
      });
    } catch (error) {
      this.logOperation('設定履歴追加', false, {
        error: error.message,
      });
      console.warn('⚠️ Failed to add to recent configs:', error);
    }
  }

  /**
   * 最近の設定保存
   */
  async saveRecentConfigs() {
    try {
      if (window.electronAPI && window.electronAPI.saveRecentConfigs) {
        await window.electronAPI.saveRecentConfigs(this.recentConfigs);
      } else {
        // フォールバック: localStorage使用
        localStorage.setItem('mgr-recent-configs', JSON.stringify(this.recentConfigs));
      }
    } catch (error) {
      console.warn('⚠️ Failed to save recent configs:', error);
    }
  }

  /**
   * カスタムテンプレート作成
   */
  createCustomTemplate(name, description) {
    const config = this.uiController.getCurrentConfig();

    const customTemplate = {
      id: `custom-${Date.now()}`,
      name,
      description,
      icon: '⭐',
      rules: config.replacements,
      extensions: config.target_settings?.file_extensions?.join(',') || '',
      category: 'custom',
      created: new Date().toISOString(),
    };

    this.templates.set(customTemplate.id, customTemplate);
    this.setupTemplateSelect(); // UI更新

    this.logOperation('カスタムテンプレート作成', true, {
      templateId: customTemplate.id,
      templateName: name,
      rulesCount: customTemplate.rules.length,
    });

    return customTemplate;
  }

  /**
   * ルールクリア確認
   */
  async confirmClearRules() {
    return new Promise(resolve => {
      // 簡易確認ダイアログ（将来的にはモーダルに置き換え）
      // eslint-disable-next-line no-alert
      const confirmed = confirm(
        '現在の置換ルールをクリアしてテンプレートを適用しますか？\n\n' +
          '※ 未保存の設定は失われます。'
      );
      resolve(confirmed);
    });
  }

  /**
   * ユーティリティ関数
   */
  formatDate(timestamp) {
    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return '今';
    }
    if (diffMins < 60) {
      return `${diffMins}分前`;
    }
    if (diffHours < 24) {
      return `${diffHours}時間前`;
    }
    if (diffDays < 7) {
      return `${diffDays}日前`;
    }

    return date.toLocaleDateString('ja-JP');
  }

  getConfigSummary(config) {
    const rulesCount = config.replacements?.length || 0;
    const extensions = config.target_settings?.file_extensions?.join(',') || '全ファイル';
    return `${rulesCount}個のルール, ${extensions}`;
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
      window.performanceMonitor.recordResponse(operation, responseTime, 'TemplateManager');
    }

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
   * テンプレート取得
   */
  getTemplate(templateId) {
    return this.templates.get(templateId);
  }

  getTemplatesByCategory(category) {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  getAllTemplates() {
    return Array.from(this.templates.values());
  }
}

// グローバル公開（UIControllerから使用）
if (typeof window !== 'undefined') {
  window.TemplateManager = TemplateManager;
}
