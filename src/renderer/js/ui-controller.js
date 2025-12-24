/**
 * Multi Grep Replacer - UI Controller
 * メインUI制御・イベントハンドリング・IPC通信統合
 */

class UIController {
  constructor() {
    // UI状態管理
    this.currentConfig = this.getDefaultConfig();
    this.replacementRules = [];
    this.isProcessing = false;
    this.selectedFolder = '';
    this.foundFiles = [];
    this.ruleIdCounter = 1;

    // UI応答性監視
    this.uiResponseTarget = 100; // ms
    this.lastActionTime = 0;

    // モジュール統合準備
    this.ruleManager = null;
    this.templateManager = null;
    this.executionController = null;

    console.log('🎮 UI Controller initializing...');
    this.initialize();
  }

  /**
   * UI初期化
   */
  initialize() {
    // DOM読み込み完了待機
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
    console.log('🎨 Setting up UI Controller...');

    // モジュール初期化
    this.initializeModules();

    // 基本イベントリスナー設定
    this.setupEventListeners();

    // 初期状態設定
    this.updatePreview();
    this.updateActiveRuleCount();

    // 初期ルール作成
    this.initializeDefaultRules();

    // ElectronAPI確認
    this.verifyElectronAPI();

    console.log('✅ UI Controller setup completed');
  }

  /**
   * イベントリスナー設定
   */
  /**
   * モジュール初期化（RuleManager、TemplateManager統合）
   */
  initializeModules() {
    try {
      // RuleManager初期化
      if (window.RuleManager) {
        this.ruleManager = new window.RuleManager(this);
        console.log('🎯 RuleManager initialized');
      } else {
        console.warn('⚠️ RuleManager not available, using fallback functionality');
      }

      // TemplateManager初期化
      if (window.TemplateManager) {
        this.templateManager = new window.TemplateManager(this);
        console.log('📋 TemplateManager initialized');
      } else {
        console.warn('⚠️ TemplateManager not available, using fallback functionality');
      }

      // ExecutionController初期化
      if (window.ExecutionController) {
        this.executionController = new window.ExecutionController();
        console.log('🚀 ExecutionController initialized');
      } else {
        console.warn('⚠️ ExecutionController not available, using fallback functionality');
      }

      // Vibe Logger統合
      if (window.vibeLogger) {
        window.vibeLogger.logUIOperation('モジュール統合初期化', true, {
          ruleManagerAvailable: !!this.ruleManager,
          templateManagerAvailable: !!this.templateManager,
          executionControllerAvailable: !!this.executionController,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('❌ Module initialization failed:', error);
      if (window.vibeLogger) {
        window.vibeLogger.logUIOperation('モジュール統合初期化', false, {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // キーボードショートカット設定
    this.setupKeyboardShortcuts();

    // フォルダ選択
    const browseButton = document.getElementById('browseButton');
    if (browseButton) {
      browseButton.addEventListener('click', () => this.handleFolderSelect());
    }

    // ドラッグ&ドロップ
    const folderDropZone = document.getElementById('folderDropZone');
    if (folderDropZone) {
      this.setupDragAndDrop(folderDropZone);
    }

    // Target Folder入力欄の変更監視
    const targetFolderInput = document.getElementById('targetFolder');
    if (targetFolderInput) {
      // フォーカス離脱時にパスを検証・設定
      targetFolderInput.addEventListener('blur', () => this.handleFolderPathInput());
      // Enter キー押下時にパスを検証・設定
      targetFolderInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleFolderPathInput();
        }
      });
    }

    // ファイル拡張子入力
    const fileExtensions = document.getElementById('fileExtensions');
    if (fileExtensions) {
      fileExtensions.addEventListener('input', () => this.handleExtensionsChange());
      fileExtensions.addEventListener('keyup', () => this.updatePreview());
    }

    // プリセットボタン
    document.querySelectorAll('.preset-button').forEach(button => {
      button.addEventListener('click', e => this.handlePresetSelect(e.target.dataset.preset));
    });

    // テンプレート選択
    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect) {
      templateSelect.addEventListener('change', () => this.handleTemplateSelect());
    }

    // ルール追加ボタン
    const addRuleButton = document.getElementById('addRuleButton');
    if (addRuleButton) {
      addRuleButton.addEventListener('click', () => this.handleAddRule());
    }

    // 設定管理ボタン
    const loadConfigButton = document.getElementById('loadConfigButton');
    if (loadConfigButton) {
      loadConfigButton.addEventListener('click', () => this.handleLoadConfig());
    }

    const saveConfigButton = document.getElementById('saveConfigButton');
    if (saveConfigButton) {
      saveConfigButton.addEventListener('click', () => this.handleSaveConfig());
    }

    // 実行ボタン - ExecutionControllerに委譲するため、ここでは登録しない
    // ExecutionController が直接処理する

    // ヘルプボタン
    const helpButton = document.getElementById('helpButton');
    if (helpButton) {
      helpButton.addEventListener('click', () => this.showHelp());
    }

    // モーダル制御
    this.setupModalListeners();

    console.log('👂 UI event listeners attached');
  }

  /**
   * キーボードショートカット設定
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Meta key for Mac, Ctrl for Windows/Linux
      const modifierKey = e.metaKey || e.ctrlKey;

      if (!modifierKey) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 's':
          // Ctrl/Cmd + S: 設定保存
          e.preventDefault();
          this.handleSaveConfig();
          break;

        case 'o':
          // Ctrl/Cmd + O: 設定読み込み
          e.preventDefault();
          this.handleLoadConfig();
          break;

        case 'e':
          // Ctrl/Cmd + E: 実行
          e.preventDefault();
          if (this.executionController) {
            this.executionController.handleExecuteClick({
              preventDefault: () => {
                // Event prevention handled
              },
            });
          } else {
            this.handleExecuteReplacement();
          }
          break;

        case 'n':
          // Ctrl/Cmd + N: 新規ルール追加
          e.preventDefault();
          this.handleAddRule();
          break;

        case 'f':
          // Ctrl/Cmd + F: フォルダ選択
          e.preventDefault();
          this.handleFolderSelect();
          break;

        case 'h':
          // Ctrl/Cmd + H: ヘルプ表示
          e.preventDefault();
          this.showHelp();
          break;

        case '?':
          // Ctrl/Cmd + ?: ヘルプ表示（代替）
          if (e.shiftKey) {
            e.preventDefault();
            this.showHelp();
          }
          break;
        default:
          // 他のキーは何もしない
          break;
      }

      // Escape キー: モーダル閉じる
      if (e.key === 'Escape') {
        this.closeActiveModal();
      }
    });

    // Vibe Logger記録
    if (window.vibeLogger) {
      window.vibeLogger.info('keyboard_shortcuts_initialized', 'キーボードショートカットを初期化', {
        context: {
          shortcuts: [
            'Ctrl/Cmd+S: 設定保存',
            'Ctrl/Cmd+O: 設定読み込み',
            'Ctrl/Cmd+E: 実行',
            'Ctrl/Cmd+N: 新規ルール',
            'Ctrl/Cmd+F: フォルダ選択',
            'Ctrl/Cmd+H: ヘルプ',
            'Escape: モーダル閉じる',
          ],
        },
      });
    }
  }

  /**
   * ヘルプ表示
   */
  showHelp() {
    const helpContent = `
      <h3>キーボードショートカット</h3>
      <ul style="list-style: none; padding: 0;">
        <li><kbd>${this.getModifierKeyDisplay()}+S</kbd> - 設定を保存</li>
        <li><kbd>${this.getModifierKeyDisplay()}+O</kbd> - 設定を読み込み</li>
        <li><kbd>${this.getModifierKeyDisplay()}+E</kbd> - 置換を実行</li>
        <li><kbd>${this.getModifierKeyDisplay()}+N</kbd> - 新規ルール追加</li>
        <li><kbd>${this.getModifierKeyDisplay()}+F</kbd> - フォルダ選択</li>
        <li><kbd>${this.getModifierKeyDisplay()}+H</kbd> - このヘルプを表示</li>
        <li><kbd>Escape</kbd> - モーダルを閉じる</li>
      </ul>
      
      <h3>使い方</h3>
      <ol>
        <li>対象フォルダを選択（Browse ボタンまたはドラッグ&ドロップ）</li>
        <li>ファイル拡張子を指定（空欄で全ファイル対象）</li>
        <li>置換ルールを設定（From → To）</li>
        <li>Execute Replacement ボタンで実行</li>
      </ol>
      
      <h3>ヒント</h3>
      <ul>
        <li>ルールは上から順番に適用されます</li>
        <li>チェックボックスでルールの有効/無効を切り替えられます</li>
        <li>設定は JSON ファイルとして保存・共有できます</li>
      </ul>
    `;

    this.showHelpModal('Multi Grep Replacer ヘルプ', helpContent);
  }

  /**
   * 修飾キーの表示名取得
   */
  getModifierKeyDisplay() {
    // macOS では Cmd、それ以外では Ctrl
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl';
  }

  /**
   * ヘルプモーダル表示
   */
  showHelpModal(title, content) {
    // 既存のヘルプモーダルがあれば削除
    const existingModal = document.getElementById('helpModal');
    if (existingModal) {
      existingModal.remove();
    }

    // ヘルプモーダル作成
    const modalHtml = `
      <div id="helpModal" class="modal">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h2>${title}</h2>
            <span class="modal-close" onclick="document.getElementById('helpModal').remove()">×</span>
          </div>
          <div class="modal-body" style="padding: 20px;">
            ${content}
          </div>
          <div class="modal-footer">
            <button class="button button-primary" onclick="document.getElementById('helpModal').remove()">
              閉じる
            </button>
          </div>
        </div>
      </div>
    `;

    // モーダルを body に追加
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // モーダルを表示
    const helpModal = document.getElementById('helpModal');
    helpModal.classList.add('scale-in');

    // Escape キーでモーダルを閉じる
    const handleEscape = e => {
      if (e.key === 'Escape') {
        helpModal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Vibe Logger記録
    if (window.vibeLogger) {
      window.vibeLogger.info('help_shown', 'ヘルプが表示されました', {
        context: {
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * アクティブなモーダルを閉じる
   */
  closeActiveModal() {
    // 結果モーダル
    const resultModal = document.getElementById('resultModal');
    if (resultModal && !resultModal.classList.contains('hidden')) {
      this.hideResultModal();
      return;
    }

    // ヘルプモーダル
    const helpModal = document.getElementById('helpModal');
    if (helpModal) {
      helpModal.remove();
      return;
    }

    // その他のモーダル（エラー通知など）
    const notifications = document.querySelectorAll('.error-notification, .success-notification');
    notifications.forEach(notification => notification.remove());
  }

  /**
   * ドラッグ&ドロップ設定
   */
  setupDragAndDrop(dropZone) {
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('drag-active');
      const overlay = dropZone.querySelector('.drop-overlay');
      if (overlay) {
        overlay.classList.add('active');
      }
    });

    dropZone.addEventListener('dragleave', e => {
      if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-active');
        const overlay = dropZone.querySelector('.drop-overlay');
        if (overlay) {
          overlay.classList.remove('active');
        }
      }
    });

    dropZone.addEventListener('drop', async e => {
      e.preventDefault();
      dropZone.classList.remove('drag-active');
      const overlay = dropZone.querySelector('.drop-overlay');
      if (overlay) {
        overlay.classList.remove('active');
      }

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && files[0].type === '') {
        // フォルダがドロップされた場合
        await this.handleFolderDrop(files[0].path);
      }
    });
  }

  /**
   * モーダルリスナー設定
   */
  setupModalListeners() {
    // 進捗モーダル
    const pauseButton = document.getElementById('pauseButton');
    const stopButton = document.getElementById('stopButton');

    if (pauseButton) {
      pauseButton.addEventListener('click', () => this.handlePauseReplacement());
    }

    if (stopButton) {
      stopButton.addEventListener('click', () => this.handleStopReplacement());
    }

    // 結果モーダル
    const modalClose = document.querySelector('.modal-close');
    const closeResultButton = document.getElementById('closeResultButton');
    const exportResultsButton = document.getElementById('exportResultsButton');
    const copySummaryButton = document.getElementById('copySummaryButton');

    if (modalClose) {
      modalClose.addEventListener('click', () => this.hideResultModal());
    }

    if (closeResultButton) {
      closeResultButton.addEventListener('click', () => this.hideResultModal());
    }

    if (exportResultsButton) {
      exportResultsButton.addEventListener('click', () => this.handleExportResults());
    }

    if (copySummaryButton) {
      copySummaryButton.addEventListener('click', () => this.handleCopySummary());
    }
  }

  /**
   * 手動入力されたフォルダパス処理
   */
  async handleFolderPathInput() {
    const targetFolderInput = document.getElementById('targetFolder');
    if (!targetFolderInput) {
      return;
    }

    const inputPath = targetFolderInput.value.trim();

    // 空の場合は何もしない
    if (!inputPath) {
      this.selectedFolder = '';
      this.updateFolderDisplay('');
      await this.updatePreview();
      return;
    }

    const startTime = performance.now();

    try {
      console.log(`📂 Validating manual folder path: ${inputPath}`);

      // パスの存在確認（IPCを通じてメインプロセスで確認）
      const result = await window.electronAPI.validateFolderPath(inputPath);
      const responseTime = performance.now() - startTime;

      // パフォーマンス監視
      if (
        window.performanceMonitor &&
        typeof window.performanceMonitor.recordResponse === 'function'
      ) {
        window.performanceMonitor.recordResponse('folderPathInput', responseTime);
      }

      if (result.success && result.exists) {
        this.selectedFolder = inputPath;
        this.updateFolderDisplay(inputPath);
        await this.updatePreview();
        console.log(`✅ Manual folder path validated: ${inputPath}`);
      } else {
        // パスが存在しない場合の処理
        this.showError(
          'フォルダパス無効',
          `指定されたパス "${inputPath}" は存在しないか、アクセスできません`
        );
        // 入力欄を元の値に戻す
        targetFolderInput.value = this.selectedFolder || '';
      }
    } catch (error) {
      console.error('❌ Folder path validation failed:', error);
      this.showError(
        'パス検証失敗',
        `フォルダパスの確認中にエラーが発生しました: ${error.message}`
      );
      // 入力欄を元の値に戻す
      targetFolderInput.value = this.selectedFolder || '';
    }
  }

  /**
   * フォルダ選択処理
   */
  async handleFolderSelect() {
    const startTime = performance.now();

    try {
      console.log('📂 Opening folder selection dialog...');

      const result = await window.electronAPI.selectFolder();
      const responseTime = performance.now() - startTime;

      if (
        window.performanceMonitor &&
        typeof window.performanceMonitor.recordResponse === 'function'
      ) {
        window.performanceMonitor.recordResponse('folderSelect', responseTime);
      }

      if (result.success && result.folderPath) {
        this.selectedFolder = result.folderPath;
        this.updateFolderDisplay(result.folderPath);
        await this.updatePreview();

        console.log(`📂 Folder selected: ${result.folderPath}`);
      } else if (result.cancelled) {
        console.log('📂 Folder selection cancelled');
      } else {
        this.showError('フォルダ選択エラー', result.error);
      }
    } catch (error) {
      console.error('❌ Folder selection failed:', error);
      this.showError('フォルダ選択失敗', error.message);
    }
  }

  /**
   * フォルダドロップ処理
   */
  async handleFolderDrop(folderPath) {
    console.log(`📂 Folder dropped: ${folderPath}`);
    this.selectedFolder = folderPath;
    this.updateFolderDisplay(folderPath);
    await this.updatePreview();
  }

  /**
   * フォルダ表示更新
   */
  updateFolderDisplay(folderPath) {
    const folderInput = document.getElementById('targetFolder');
    const folderStatus = document.getElementById('folderStatus');

    if (folderInput) {
      folderInput.value = folderPath;
    }

    if (folderStatus) {
      folderStatus.textContent = `Selected: ${folderPath}`;
    }
  }

  /**
   * ファイル拡張子変更処理
   */
  handleExtensionsChange() {
    const startTime = performance.now();

    // 入力応答性を監視
    setTimeout(() => {
      const responseTime = performance.now() - startTime;
      if (
        window.performanceMonitor &&
        typeof window.performanceMonitor.recordResponse === 'function'
      ) {
        window.performanceMonitor.recordResponse('extensionsInput', responseTime);
      }
    }, 0);

    // プレビュー更新
    this.debounce(() => this.updatePreview(), 300)();
  }

  /**
   * プリセット選択処理
   */
  handlePresetSelect(preset) {
    const fileExtensions = document.getElementById('fileExtensions');
    if (!fileExtensions) {
      return;
    }

    const presets = {
      web: '.html,.shtml,.css,.scss,.js,.jsx,.tsx,.vue,.php',
      docs: '.md,.txt,.doc,.docx,.pdf',
      code: '.js,.ts,.jsx,.tsx,.css,.scss,.html,.php,.py,.java,.cpp,.c',
      all: '',
    };

    fileExtensions.value = presets[preset] || '';
    fileExtensions.classList.add('fade-in');

    this.updatePreview();
  }

  /**
   * テンプレート選択処理（現在無効化）
   */
  async handleTemplateSelect() {
    // テンプレート機能は将来の実装予定（現在はエラー防止のため無効化）
    console.log('📋 Template functionality is not yet implemented');

    // テンプレート選択をリセット
    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect) {
      templateSelect.value = '';
    }
  }

  /**
   * ルール追加処理（RuleManager統合版）
   */
  handleAddRule() {
    const startTime = performance.now();

    try {
      // RuleManagerが利用可能な場合は委譲
      if (this.ruleManager) {
        return this.ruleManager.addRule();
      }

      // フォールバック: 従来の処理
      const newRule = {
        id: `rule-${this.ruleIdCounter++}`,
        from: '',
        to: '',
        enabled: true,
        description: '',
      };

      this.replacementRules.push(newRule);
      this.renderRules();
      this.updateActiveRuleCount();

      // 新しいルールの入力フィールドにフォーカス
      setTimeout(() => {
        const newRuleElement = document.querySelector(`[data-rule-id="${newRule.id}"] .rule-from`);
        if (newRuleElement) {
          newRuleElement.focus();
        }

        const responseTime = performance.now() - startTime;
        if (
          window.performanceMonitor &&
          typeof window.performanceMonitor.recordResponse === 'function'
        ) {
          window.performanceMonitor.recordResponse('addRule', responseTime);
        }
      }, 100);

      console.log(`➕ Rule added (fallback): ${newRule.id}`);
      return newRule;
    } catch (error) {
      console.error('❌ Add rule failed:', error);
      this.showError('ルール追加失敗', error.message);
    }
  }

  /**
   * ルール削除処理（RuleManager統合版）
   */
  handleDeleteRule(ruleId) {
    try {
      // RuleManagerが利用可能な場合は委譲
      if (this.ruleManager) {
        return this.ruleManager.deleteRule(ruleId);
      }

      // フォールバック: 従来の処理
      const ruleIndex = this.replacementRules.findIndex(rule => rule.id === ruleId);
      if (ruleIndex === -1) {
        return;
      }

      const ruleElement = document.querySelector(`[data-rule-id="${ruleId}"]`);
      if (ruleElement) {
        ruleElement.classList.add('removing');
        setTimeout(() => {
          this.replacementRules.splice(ruleIndex, 1);
          this.renderRules();
          this.updateActiveRuleCount();
        }, 300);
      }

      console.log(`🗑️ Rule deleted (fallback): ${ruleId}`);
    } catch (error) {
      console.error('❌ Delete rule failed:', error);
      this.showError('ルール削除失敗', error.message);
    }
  }

  /**
   * ルール有効/無効切り替え（RuleManager統合版）
   */
  handleToggleRule(ruleId) {
    try {
      // RuleManagerが利用可能な場合は委譲
      if (this.ruleManager) {
        return this.ruleManager.toggleRule(ruleId);
      }

      // フォールバック: 従来の処理
      const rule = this.replacementRules.find(r => r.id === ruleId);
      if (rule) {
        rule.enabled = !rule.enabled;
        this.updateActiveRuleCount();
        console.log(`🔄 Rule toggled (fallback): ${ruleId} -> ${rule.enabled}`);
      }
    } catch (error) {
      console.error('❌ Toggle rule failed:', error);
    }
  }

  /**
   * ルール更新処理（RuleManager統合版）
   */
  handleUpdateRule(ruleId, field, value) {
    try {
      // RuleManagerが利用可能な場合は委譲
      if (this.ruleManager) {
        return this.ruleManager.updateRule(ruleId, field, value);
      }

      // フォールバック: 従来の処理
      const rule = this.replacementRules.find(r => r.id === ruleId);
      if (rule) {
        rule[field] = value;
        console.log(`📝 Rule updated (fallback): ${ruleId}.${field} = ${value}`);
      }
    } catch (error) {
      console.error('❌ Update rule failed:', error);
    }
  }

  /**
   * ルール描画（RuleManager統合版）
   */
  renderRules() {
    try {
      // RuleManagerが利用可能な場合は委譲
      if (this.ruleManager) {
        return this.ruleManager.rerenderAllRules();
      }

      // フォールバック: 従来の処理
      const rulesList = document.getElementById('rulesList');
      if (!rulesList) {
        return;
      }

      rulesList.innerHTML = '';

      this.replacementRules.forEach(rule => {
        const ruleElement = this.createRuleElement(rule);
        rulesList.appendChild(ruleElement);
      });

      console.log('🔄 Rules rendered (fallback)');
    } catch (error) {
      console.error('❌ Render rules failed:', error);
    }
  }

  /**
   * ルール要素作成
   */
  createRuleElement(rule) {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'rule-item new';
    ruleDiv.setAttribute('data-rule-id', rule.id);

    // checkbox要素の作成
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'rule-checkbox';
    checkbox.checked = !!rule.enabled;
    checkbox.setAttribute('aria-label', 'Enable rule');

    // from label要素の作成
    const fromLabel = document.createElement('span');
    fromLabel.className = 'rule-from-label';
    fromLabel.textContent = 'From:';

    // from input要素の作成
    const fromInput = document.createElement('input');
    fromInput.type = 'text';
    fromInput.className = 'rule-from';
    fromInput.placeholder = '検索文字列';
    fromInput.value = rule.from || '';
    fromInput.setAttribute('aria-label', 'Search text');

    // arrow要素の作成
    const arrow = document.createElement('span');
    arrow.className = 'rule-arrow';
    arrow.textContent = '→';

    // to label要素の作成
    const toLabel = document.createElement('span');
    toLabel.className = 'rule-to-label';
    toLabel.textContent = 'To:';

    // to input要素の作成
    const toInput = document.createElement('input');
    toInput.type = 'text';
    toInput.className = 'rule-to';
    toInput.placeholder = '置換文字列';
    toInput.value = rule.to || '';
    toInput.setAttribute('aria-label', 'Replace text');

    // delete button要素の作成
    const deleteButton = document.createElement('button');
    deleteButton.className = 'icon-button rule-delete';
    deleteButton.title = 'Delete rule';
    deleteButton.setAttribute('aria-label', 'Delete rule');
    const deleteIcon = document.createElement('span');
    deleteIcon.textContent = '🗑️';
    deleteButton.appendChild(deleteIcon);

    // drag button要素の作成
    const dragButton = document.createElement('button');
    dragButton.className = 'icon-button rule-drag';
    dragButton.title = 'Drag to reorder';
    dragButton.setAttribute('aria-label', 'Reorder rule');
    const dragIcon = document.createElement('span');
    dragIcon.textContent = '↕️';
    dragButton.appendChild(dragIcon);

    // DOM要素をruleDivに追加
    ruleDiv.appendChild(checkbox);
    ruleDiv.appendChild(fromLabel);
    ruleDiv.appendChild(fromInput);
    ruleDiv.appendChild(arrow);
    ruleDiv.appendChild(toLabel);
    ruleDiv.appendChild(toInput);
    ruleDiv.appendChild(deleteButton);
    ruleDiv.appendChild(dragButton);

    checkbox.addEventListener('change', () => this.handleToggleRule(rule.id));
    fromInput.addEventListener('input', e =>
      this.handleUpdateRule(rule.id, 'from', e.target.value)
    );
    toInput.addEventListener('input', e => this.handleUpdateRule(rule.id, 'to', e.target.value));
    deleteButton.addEventListener('click', () => this.handleDeleteRule(rule.id));

    // アニメーション適用
    setTimeout(() => ruleDiv.classList.remove('new'), 100);

    return ruleDiv;
  }

  /**
   * プレビュー更新
   */
  async updatePreview() {
    if (!this.selectedFolder) {
      this.updatePreviewDisplay(0, 0);
      return;
    }

    try {
      const extensions = this.getSelectedExtensions();
      const result = await window.electronAPI.findFiles(this.selectedFolder, extensions, [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
      ]);

      if (result.success) {
        this.foundFiles = result.files;
        const activeRules = this.replacementRules.filter(
          rule => rule.enabled && rule.from && rule.to
        );
        this.updatePreviewDisplay(result.files.length, activeRules.length);
      } else {
        this.updatePreviewDisplay(0, 0);
      }
    } catch (error) {
      console.error('❌ Preview update failed:', error);
      this.updatePreviewDisplay(0, 0);
    }
  }

  /**
   * プレビュー表示更新
   */
  updatePreviewDisplay(fileCount, ruleCount) {
    const fileCountElement = document.getElementById('fileCount');
    const activeRuleCountElement = document.getElementById('activeRuleCount');

    if (fileCountElement) {
      fileCountElement.textContent = fileCount;
    }

    if (activeRuleCountElement) {
      activeRuleCountElement.textContent = ruleCount;
    }
  }

  /**
   * アクティブルール数更新
   */
  updateActiveRuleCount() {
    const activeRules = this.replacementRules.filter(rule => rule.enabled && rule.from && rule.to);
    const activeRuleCountElement = document.getElementById('activeRuleCount');

    if (activeRuleCountElement) {
      activeRuleCountElement.textContent = activeRules.length;
    }
  }

  /**
   * 選択された拡張子取得
   */
  getSelectedExtensions() {
    const fileExtensions = document.getElementById('fileExtensions');
    if (!fileExtensions || !fileExtensions.value.trim()) {
      return [];
    }

    return fileExtensions.value
      .split(',')
      .map(ext => ext.trim())
      .filter(ext => ext.length > 0);
  }

  /**
   * 置換実行処理
   */
  /**
   * 実行ボタンハンドラー - ExecutionControllerに委譲
   */
  async handleExecuteReplacement() {
    try {
      // ExecutionControllerが利用可能な場合は委譲
      if (this.executionController) {
        // ExecutionControllerのhandleExecuteClickメソッドを呼び出し
        await this.executionController.handleExecuteClick({
          preventDefault: () => {
            // Empty function for compatibility
          },
        });
        return;
      }

      // フォールバック処理：従来の実装（ExecutionControllerが無い場合）
      console.warn('⚠️ ExecutionController not available, using fallback');

      if (this.isProcessing) {
        console.log('⚠️ Replacement already in progress');
        return;
      }

      // 基本バリデーション
      if (!this.selectedFolder) {
        this.showError('エラー', 'フォルダを選択してください');
        return;
      }

      const activeRules = this.replacementRules.filter(
        rule => rule.enabled && rule.from && rule.to
      );
      if (activeRules.length === 0) {
        this.showError('エラー', '有効な置換ルールがありません');
        return;
      }

      this.showError('実装待ち', 'ExecutionController実装待ち - フォールバック処理');
    } catch (error) {
      console.error('❌ Execute replacement handler failed:', error);
      this.showError('実行エラー', error.message);
    }
  }

  /**
   * 進捗更新
   */
  updateProgress(progress) {
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const progressCurrent = document.getElementById('progressCurrent');
    const progressTotal = document.getElementById('progressTotal');
    const currentFile = document.getElementById('currentFile');
    const changesMade = document.getElementById('changesMade');

    if (progressBar) {
      progressBar.style.width = `${progress.percentage}%`;
    }

    if (progressPercent) {
      progressPercent.textContent = `${Math.round(progress.percentage)}%`;
    }

    if (progressCurrent) {
      progressCurrent.textContent = progress.current;
    }

    if (progressTotal) {
      progressTotal.textContent = progress.total;
    }

    if (currentFile) {
      currentFile.textContent = progress.currentFile || '-';
    }

    if (changesMade) {
      changesMade.textContent = progress.totalChanges || 0;
    }
  }

  /**
   * 設定読み込み処理
   */
  async handleLoadConfig() {
    try {
      console.log('📖 Loading configuration...');
      // ファイルパスは指定しない（IPCハンドラー側でダイアログを表示）
      const result = await window.electronAPI.loadConfig();

      if (result.success) {
        this.loadConfigData(result.config);
        this.showSuccess('設定読み込み完了', '設定ファイルを読み込みました');
      } else if (result.cancelled) {
        console.log('📖 Config loading cancelled by user');
        // キャンセルの場合はエラー表示しない
      } else {
        this.showError('設定読み込み失敗', result.error || '不明なエラーが発生しました');
      }
    } catch (error) {
      console.error('❌ Config loading failed:', error);
      this.showError('設定読み込み失敗', error.message);
    }
  }

  /**
   * 設定保存処理
   */
  async handleSaveConfig() {
    try {
      console.log('💾 Saving configuration...');

      const config = this.getCurrentConfig();
      // ファイルパスは指定しない（IPCハンドラー側でダイアログを表示）
      const result = await window.electronAPI.saveConfig(config);

      if (result.success) {
        this.showSuccess('設定保存完了', '設定ファイルを保存しました');
      } else if (result.cancelled) {
        console.log('💾 Config saving cancelled by user');
        // キャンセルの場合はエラー表示しない
      } else {
        this.showError('設定保存失敗', result.error || '不明なエラーが発生しました');
      }
    } catch (error) {
      console.error('❌ Config saving failed:', error);
      this.showError('設定保存失敗', error.message);
    }
  }

  /**
   * 設定データ読み込み（TemplateManager統合版）
   */
  loadConfigData(config) {
    try {
      // フォルダパス設定
      if (config.target_folder) {
        this.selectedFolder = config.target_folder;
        this.updateFolderDisplay(config.target_folder);
      }

      // 拡張子設定
      const fileExtensions = document.getElementById('fileExtensions');
      if (fileExtensions && config.target_settings?.file_extensions) {
        fileExtensions.value = config.target_settings.file_extensions.join(',');
      }

      // 置換ルール設定
      if (config.replacements) {
        // 既存ルールクリア
        if (this.ruleManager) {
          this.ruleManager.clearAllRules();
        } else {
          this.replacementRules = [];
        }

        // 新規ルール追加
        config.replacements.forEach((rule, index) => {
          const newRule = {
            from: rule.from,
            to: rule.to,
            enabled: rule.enabled !== false,
            description: rule.description || '',
          };

          if (this.ruleManager) {
            this.ruleManager.addRule(newRule);
          } else {
            // フォールバック
            const ruleWithId = {
              ...newRule,
              id: `rule-${index + 1}`,
            };
            this.replacementRules.push(ruleWithId);
          }
        });

        this.ruleIdCounter = config.replacements.length + 1;

        if (!this.ruleManager) {
          this.renderRules();
        }
      }

      this.updatePreview();
      this.updateActiveRuleCount();

      // TemplateManagerに履歴追加
      if (this.templateManager) {
        this.templateManager.addToRecentConfigs(config);
      }

      console.log('✅ Configuration loaded successfully');
    } catch (error) {
      console.error('❌ Load config data failed:', error);
      this.showError('設定読み込み失敗', error.message);
    }
  }

  /**
   * 現在の設定取得
   */
  getCurrentConfig() {
    return {
      app_info: {
        name: 'Multi Grep Replacer Configuration',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        description: 'User configuration',
        author: 'User',
      },
      target_folder: this.selectedFolder,
      replacements: this.replacementRules.map(rule => ({
        id: rule.id,
        from: rule.from,
        to: rule.to,
        enabled: rule.enabled,
        description: rule.description,
      })),
      target_settings: {
        file_extensions: this.getSelectedExtensions(),
        exclude_patterns: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
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
        theme: document.body.className.includes('theme-')
          ? document.body.className.match(/theme-(\w+)/)[1]
          : 'auto',
      },
    };
  }

  /**
   * デフォルト設定取得
   */
  getDefaultConfig() {
    return {
      selectedFolder: '',
      fileExtensions: '.html,.css,.js,.jsx,.tsx,.vue,.php',
      replacementRules: [],
    };
  }

  /**
   * 初期ルール作成
   */
  initializeDefaultRules() {
    // HTMLに既に定義されているルールを読み込み
    const existingRules = document.querySelectorAll('.rule-item');
    existingRules.forEach((ruleElement, index) => {
      const fromInput = ruleElement.querySelector('.rule-from');
      const toInput = ruleElement.querySelector('.rule-to');

      if (fromInput && toInput) {
        const rule = {
          id: `rule-${index + 1}`,
          from: fromInput.value,
          to: toInput.value,
          enabled: true,
          description: '',
        };

        this.replacementRules.push(rule);
        this.setupRuleListeners(ruleElement, rule);
      }
    });

    this.ruleIdCounter = this.replacementRules.length + 1;
    this.updateActiveRuleCount();
  }

  /**
   * ルールリスナー設定
   */
  setupRuleListeners(ruleElement, rule) {
    const checkbox = ruleElement.querySelector('.rule-checkbox');
    const fromInput = ruleElement.querySelector('.rule-from');
    const toInput = ruleElement.querySelector('.rule-to');
    const deleteButton = ruleElement.querySelector('.rule-delete');

    if (checkbox) {
      checkbox.addEventListener('change', () => this.handleToggleRule(rule.id));
    }
    if (fromInput) {
      fromInput.addEventListener('input', e =>
        this.handleUpdateRule(rule.id, 'from', e.target.value)
      );
    }
    if (toInput) {
      toInput.addEventListener('input', e => this.handleUpdateRule(rule.id, 'to', e.target.value));
    }
    if (deleteButton) {
      deleteButton.addEventListener('click', () => this.handleDeleteRule(rule.id));
    }
  }

  /**
   * モーダル表示制御
   */
  showProgressModal() {
    const progressModal = document.getElementById('progressModal');
    if (progressModal) {
      progressModal.classList.remove('hidden');
      progressModal.classList.add('scale-in');
    }
  }

  hideProgressModal() {
    const progressModal = document.getElementById('progressModal');
    if (progressModal) {
      progressModal.classList.add('hidden');
      progressModal.classList.remove('scale-in');
    }
  }

  showResultModal(results) {
    const resultModal = document.getElementById('resultModal');
    const resultDetails = document.getElementById('resultDetails');
    const resultSummary = document.getElementById('resultSummary');

    if (resultModal && resultDetails && resultSummary) {
      // サマリー更新
      const modifiedFiles = results.filter(r => r.changes > 0).length;
      const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);

      resultSummary.textContent = `${modifiedFiles} files modified with ${totalChanges} total changes`;

      // 詳細結果表示
      resultDetails.innerHTML = results
        .filter(result => result.changes > 0)
        .map(
          result => `
          <div class="result-file">
            <div class="result-file-path">
              <span>✅</span> ${result.path} (${result.changes} changes)
            </div>
            <div class="result-changes">
              ${
                result.details
                  ?.map(
                    detail =>
                      `<div class="result-change-item">- ${detail.rule}: ${detail.count} occurrences</div>`
                  )
                  .join('') || ''
              }
            </div>
          </div>
        `
        )
        .join('');

      resultModal.classList.remove('hidden');
      resultModal.classList.add('scale-in');
    }
  }

  hideResultModal() {
    const resultModal = document.getElementById('resultModal');
    if (resultModal) {
      resultModal.classList.add('hidden');
      resultModal.classList.remove('scale-in');
    }
  }

  /**
   * エラー表示
   */
  showError(title, message) {
    console.error(`❌ ${title}: ${message}`);

    // 一時的なエラー表示（将来的にはモーダルに置き換え）
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification slide-in-right';
    errorDiv.innerHTML = `
      <div class="error-header">
        <span class="error-icon">❌</span>
        <span class="error-title">${title}</span>
      </div>
      <div class="error-message">${message}</div>
      <button class="error-close">×</button>
    `;

    document.body.appendChild(errorDiv);

    // 閉じるボタンと自動削除
    const closeButton = errorDiv.querySelector('.error-close');
    closeButton.addEventListener('click', () => errorDiv.remove());

    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.classList.add('fade-out');
        setTimeout(() => errorDiv.remove(), 300);
      }
    }, 5000);
  }

  /**
   * 成功メッセージ表示
   */
  showSuccess(title, message) {
    console.log(`✅ ${title}: ${message}`);

    // 成功通知表示
    const successDiv = document.createElement('div');
    successDiv.className = 'success-notification slide-in-right';
    successDiv.innerHTML = `
      <div class="success-header">
        <span class="success-icon">✅</span>
        <span class="success-title">${title}</span>
      </div>
      <div class="success-message">${message}</div>
      <button class="success-close">×</button>
    `;

    document.body.appendChild(successDiv);

    // 閉じるボタンと自動削除
    const closeButton = successDiv.querySelector('.success-close');
    closeButton.addEventListener('click', () => successDiv.remove());

    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.classList.add('fade-out');
        setTimeout(() => successDiv.remove(), 300);
      }
    }, 3000);
  }

  /**
   * ElectronAPI確認
   */
  verifyElectronAPI() {
    if (typeof window.electronAPI === 'undefined') {
      console.error('❌ ElectronAPI not available');
      this.showError('システムエラー', 'ElectronAPIが利用できません');
      return false;
    }

    console.log('✅ ElectronAPI verified');
    return true;
  }

  /**
   * デバウンス関数
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 処理中断処理
   */
  async handlePauseReplacement() {
    try {
      await window.electronAPI.pauseReplacement();
      console.log('⏸️ Replacement paused');
    } catch (error) {
      console.error('❌ Pause failed:', error);
    }
  }

  /**
   * 処理停止処理
   */
  async handleStopReplacement() {
    try {
      await window.electronAPI.stopReplacement();
      this.isProcessing = false;
      this.hideProgressModal();
      console.log('⏹️ Replacement stopped');
    } catch (error) {
      console.error('❌ Stop failed:', error);
    }
  }

  /**
   * 結果エクスポート処理
   */
  async handleExportResults() {
    try {
      const config = this.getCurrentConfig();
      await window.electronAPI.exportResults(config);
      console.log('📤 Results exported');
    } catch (error) {
      console.error('❌ Export failed:', error);
    }
  }

  /**
   * サマリーコピー処理
   */
  async handleCopySummary() {
    try {
      const resultSummary = document.getElementById('resultSummary');
      if (resultSummary) {
        await navigator.clipboard.writeText(resultSummary.textContent);
        console.log('📋 Summary copied to clipboard');
      }
    } catch (error) {
      console.error('❌ Copy failed:', error);
    }
  }
}

// DOM読み込み完了後にUIController初期化
document.addEventListener('DOMContentLoaded', () => {
  window.uiController = new UIController();
  console.log('🎮 UI Controller initialized');
});
