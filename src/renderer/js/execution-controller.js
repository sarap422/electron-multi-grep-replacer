/**
 * ExecutionController - 置換処理の実行制御・進捗管理・結果表示
 * Task 3.3.1: 実行制御・進捗表示UI実装
 *
 * 主な責務：
 * - 実行状態管理（idle/executing/pausing/completed/error）
 * - 実行前確認ダイアログ
 * - IPC通信による置換処理の開始・中断・再開
 * - リアルタイム進捗表示
 * - 結果表示・エクスポート
 * - Vibe Logger統合
 */

class ExecutionController {
  constructor() {
    this.state = 'idle'; // idle, executing, pausing, completed, error
    this.currentExecution = null;
    this.startTime = null;
    this.timerInterval = null;
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      changedFiles: 0,
      totalChanges: 0,
      errors: 0,
    };

    // UI要素の参照
    this.elements = {
      // ボタン
      executeButton: document.getElementById('executeButton'),
      pauseButton: document.getElementById('pauseButton'),
      stopButton: document.getElementById('stopButton'),

      // 進捗モーダル
      progressModal: document.getElementById('progressModal'),
      progressBar: document.getElementById('progressBar'),
      progressPercent: document.getElementById('progressPercent'),
      progressCurrent: document.getElementById('progressCurrent'),
      progressTotal: document.getElementById('progressTotal'),
      currentFile: document.getElementById('currentFile'),
      elapsedTime: document.getElementById('elapsedTime'),
      changesMade: document.getElementById('changesMade'),

      // 結果モーダル
      resultModal: document.getElementById('resultModal'),
      resultTitle: document.getElementById('result-title'),
      resultSummary: document.getElementById('resultSummary'),
      completionTime: document.getElementById('completionTime'),
      resultDetails: document.getElementById('resultDetails'),
      modalClose: document.querySelector('#resultModal .modal-close'),
      closeResultButton: document.getElementById('closeResultButton'),
      exportResultsButton: document.getElementById('exportResultsButton'),
      copySummaryButton: document.getElementById('copySummaryButton'),
    };

    // Vibe Logger初期化確認
    if (window.vibeLogger) {
      window.vibeLogger.info('execution_controller_init', 'ExecutionController初期化', {
        context: {
          timestamp: new Date().toISOString(),
          component: 'ExecutionController',
          initialState: this.state,
        },
        humanNote: '置換実行制御システムの初期化完了',
      });
    }

    this.initializeEventListeners();
  }

  /**
   * イベントリスナーの初期化
   * UI応答性100ms以内を保証
   */
  initializeEventListeners() {
    const startTime = performance.now();

    try {
      // 実行ボタン
      this.elements.executeButton?.addEventListener('click', event => {
        this.handleExecuteClick(event);
      });

      // 進捗制御ボタン
      this.elements.pauseButton?.addEventListener('click', _event => {
        this.handlePauseClick(_event);
      });

      this.elements.stopButton?.addEventListener('click', _event => {
        this.handleStopClick(_event);
      });

      // 結果モーダル制御
      this.elements.modalClose?.addEventListener('click', _event => {
        this.closeResultModal();
      });

      this.elements.closeResultButton?.addEventListener('click', _event => {
        this.closeResultModal();
      });

      this.elements.exportResultsButton?.addEventListener('click', event => {
        this.handleExportResults(event);
      });

      this.elements.copySummaryButton?.addEventListener('click', event => {
        this.handleCopySummary(event);
      });

      // モーダル外クリックで閉じる
      this.elements.resultModal?.addEventListener('click', event => {
        if (event.target === this.elements.resultModal) {
          this.closeResultModal();
        }
      });

      // ESCキーでモーダルを閉じる
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          if (!this.elements.progressModal?.classList.contains('hidden')) {
            // 実行中はESCで確認後停止
            this.handleStopClick(event);
          } else if (!this.elements.resultModal?.classList.contains('hidden')) {
            this.closeResultModal();
          }
        }
      });

      const responseTime = performance.now() - startTime;

      // パフォーマンス記録
      if (window.vibeLogger) {
        window.vibeLogger.info('execution_listeners_init', 'イベントリスナー初期化完了', {
          context: {
            responseTime,
            targetAchieved: responseTime <= 100,
            listenerCount: 8,
          },
          aiTodo: responseTime > 100 ? 'イベントリスナー初期化の最適化が必要' : null,
        });
      }
    } catch (error) {
      if (window.vibeLogger) {
        window.vibeLogger.error('execution_listeners_error', 'イベントリスナー初期化エラー', {
          context: {
            error: error.message,
            stack: error.stack,
          },
          aiTodo: 'イベントリスナー初期化のエラーハンドリング改善',
        });
      }
      console.error('ExecutionController: イベントリスナー初期化エラー', error);
    }
  }

  /**
   * 実行ボタンクリックハンドラー
   * UI応答性100ms以内保証
   */
  async handleExecuteClick(event) {
    const startTime = performance.now();

    try {
      event.preventDefault();

      // ボタン即座反応
      this.updateExecuteButtonState('executing');

      const responseTime = performance.now() - startTime;

      if (window.vibeLogger) {
        window.vibeLogger.info('execute_button_click', '実行ボタンクリック', {
          context: {
            responseTime,
            targetAchieved: responseTime <= 100,
            state: this.state,
          },
          humanNote: '置換実行を開始します',
        });
      }

      // 実行前確認
      const shouldExecute = await this.showConfirmationDialog();
      if (!shouldExecute) {
        this.updateExecuteButtonState('idle');
        return;
      }

      // 設定取得・検証
      const config = this.gatherExecutionConfig();
      const validation = this.validateExecutionConfig(config);

      if (!validation.isValid) {
        this.showValidationErrors(validation.errors);
        this.updateExecuteButtonState('idle');
        return;
      }

      // 実行開始
      await this.startExecution(config);
    } catch (error) {
      if (window.vibeLogger) {
        window.vibeLogger.error('execute_button_error', '実行ボタンエラー', {
          context: {
            error: error.message,
            stack: error.stack,
          },
          aiTodo: '実行ボタンのエラーハンドリング改善',
        });
      }

      this.showErrorMessage('実行開始エラー', error.message);
      this.updateExecuteButtonState('idle');
    }
  }

  /**
   * 実行前確認ダイアログ
   */
  async showConfirmationDialog() {
    const config = this.gatherExecutionConfig();
    const { includeFileName, includeExtension, interpretEscapes } = config.targetOptions;
    const renameTargets = [includeFileName && 'ファイル名', includeExtension && '拡張子'].filter(
      Boolean
    );

    const message = [
      '置換処理を実行しますか？',
      '',
      `対象フォルダ: ${config.targetFolders.join(', ')}`,
      `ファイル拡張子: ${config.extensions || '全ファイル'}`,
      `置換ルール: ${config.rules.length}件`,
      ...(renameTargets.length > 0 ? [`リネーム対象: ${renameTargets.join('・')}`] : []),
      ...(interpretEscapes ? ['\\n\\t: 有効'] : []),
      '',
      '⚠️ この操作は元に戻せません。必要に応じて事前にバックアップを取ってください。',
    ].join('\n');

    return new Promise(resolve => {
      // カスタムダイアログ実装で alert() を回避
      const dialog = document.createElement('div');
      dialog.className = 'confirmation-dialog';
      dialog.innerHTML = `
                <div class="dialog-overlay">
                    <div class="dialog-content">
                        <h3 class="dialog-title">
                            <span class="dialog-icon">⚠️</span>
                            Confirm Execution
                        </h3>
                        <div class="dialog-message">${this.escapeHtml(message)}</div>
                        <div class="dialog-actions">
                            <button class="dialog-button secondary" id="dialogCancel">
                                <span class="button-icon">❌</span>
                                Cancel
                            </button>
                            <button class="dialog-button primary" id="dialogConfirm">
                                <span class="button-icon">🚀</span>
                                Execute
                            </button>
                        </div>
                    </div>
                </div>
            `;

      // スタイル適用
      const style = document.createElement('style');
      style.textContent = `
                .confirmation-dialog {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .dialog-overlay {
                    background: rgba(0, 0, 0, 0.5);
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .dialog-content {
                    background: var(--bg-primary, #FFFFFF);
                    border: 2px solid var(--border-primary, #e2e8f0);
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 500px;
                    min-width: 400px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }
                .dialog-title {
                    margin: 0 0 16px 0;
                    font-size: 1.3em;
                    color: var(--text-primary, #1e293b);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .dialog-message {
                    margin: 16px 0;
                    line-height: 1.5;
                    color: var(--text-primary, #1e293b);
                    white-space: pre-line;
                    background: var(--bg-secondary, #f8fafc);
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid var(--border-primary, #e2e8f0);
                }
                .dialog-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 24px;
                }
                .dialog-button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                }
                .dialog-button.primary {
                    background: var(--color-primary, #4f46e5);
                    color: white;
                }
                .dialog-button.secondary {
                    background: var(--bg-secondary, #f8fafc);
                    color: var(--text-primary, #1e293b);
                    border: 1px solid var(--border-primary, #e2e8f0);
                }
                .dialog-button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }
            `;

      document.head.appendChild(style);
      document.body.appendChild(dialog);

      // ボタンイベント
      const cancelButton = dialog.querySelector('#dialogCancel');
      const confirmButton = dialog.querySelector('#dialogConfirm');

      const cleanup = () => {
        try {
          // 複数回呼び出されても安全にする
          if (cleanup.called) {
            return;
          }
          cleanup.called = true;

          if (style && style.parentNode === document.head) {
            document.head.removeChild(style);
          }
          if (dialog && dialog.parentNode === document.body) {
            document.body.removeChild(dialog);
          }

          // リスナーもクリーンアップ
          document.removeEventListener('keydown', handleKeydown);
        } catch (error) {
          console.warn('Dialog cleanup error:', error);
        }
      };

      cancelButton.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      confirmButton.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      // オーバーレイクリックでキャンセル
      dialog.addEventListener('click', event => {
        if (event.target === dialog || event.target.classList.contains('dialog-overlay')) {
          cleanup();
          resolve(false);
        }
      });

      // ESCキーでキャンセル
      const handleKeydown = event => {
        if (event.key === 'Escape') {
          cleanup();
          document.removeEventListener('keydown', handleKeydown);
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleKeydown);

      // 確認ボタンにフォーカス
      setTimeout(() => confirmButton.focus(), 100);
    });
  }

  /**
   * 実行設定の収集
   */
  gatherExecutionConfig() {
    // 複数フォルダのパスを収集
    const targetFolders = [];
    const folderItems = document.querySelectorAll('.folder-item');
    folderItems.forEach(item => {
      const pathInput = item.querySelector('.folder-path-input');
      if (pathInput?.value?.trim()) {
        targetFolders.push(pathInput.value.trim());
      }
    });

    // 後方互換: 最初のフォルダをtargetFolderとしても保持
    const targetFolder = targetFolders.length > 0 ? targetFolders[0] : '';
    const extensions = document.getElementById('fileExtensions')?.value || '';

    // 置換ルールの収集
    const rules = [];
    const ruleItems = document.querySelectorAll('.rule-item');

    ruleItems.forEach((item, index) => {
      const checkbox = item.querySelector('.rule-checkbox');
      const fromInput = item.querySelector('.rule-from');
      const toInput = item.querySelector('.rule-to');

      if (checkbox?.checked && fromInput?.value) {
        rules.push({
          id: item.dataset.ruleId || `rule-${index + 1}`,
          from: fromInput.value,
          to: toInput?.value ?? '',
          enabled: true,
        });
      }
    });

    return {
      targetFolder, // 後方互換
      targetFolders, // 複数フォルダ
      extensions: extensions.trim(),
      rules,
      targetOptions: window.uiController.getTargetOptions(),
      options: {
        caseSensitive: true,
        wholeWord: false,
        maxFileSize: 104857600, // 100MB
        maxConcurrentFiles: 10,
      },
    };
  }

  /**
   * 実行設定の検証
   */
  validateExecutionConfig(config) {
    const errors = [];

    // 必須フィールドチェック（複数フォルダ対応）
    if (!config.targetFolders || config.targetFolders.length === 0) {
      errors.push('対象フォルダが選択されていません');
    }

    if (config.rules.length === 0) {
      errors.push('有効な置換ルールが設定されていません');
    }

    // フォルダ存在チェック（将来的にIPC経由で実装）

    // ルールの妥当性チェック
    config.rules.forEach((rule, index) => {
      if (!rule.from) {
        errors.push(`ルール ${index + 1}: 検索文字列が空です`);
      }
      if (rule.from === rule.to) {
        errors.push(`ルール ${index + 1}: 検索文字列と置換文字列が同じです`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 検証エラーの表示
   */
  showValidationErrors(errors) {
    const message = ['設定に問題があります：', '', ...errors.map(error => `• ${error}`)].join('\n');

    // カスタムダイアログ実装（alert回避）
    this.showToast(message, 'error');

    if (window.vibeLogger) {
      window.vibeLogger.warning('execution_validation_failed', '実行設定検証エラー', {
        context: {
          errors,
          errorCount: errors.length,
        },
        humanNote: '実行前の設定検証でエラーが発生',
      });
    }
  }

  /**
   * 実行開始
   */
  async startExecution(config) {
    try {
      this.state = 'executing';
      this.startTime = Date.now();
      this.stats = {
        totalFiles: 0,
        processedFiles: 0,
        changedFiles: 0,
        totalChanges: 0,
        errors: 0,
      };

      // 進捗モーダル表示
      this.resetProgressButtons();
      this.showProgressModal();

      // タイマー開始
      this.startTimer();

      if (window.vibeLogger) {
        window.vibeLogger.info('execution_started', '置換処理実行開始', {
          context: {
            targetFolders: config.targetFolders,
            rulesCount: config.rules.length,
            extensions: config.extensions,
            timestamp: new Date().toISOString(),
          },
          humanNote: '置換処理の実行を開始しました',
        });
      }

      // IPC経由で実行開始
      await this.executeReplacement(config);
    } catch (error) {
      if (window.vibeLogger) {
        window.vibeLogger.error('execution_start_error', '実行開始エラー', {
          context: {
            error: error.message,
            stack: error.stack,
            config,
          },
          aiTodo: '実行開始エラーの詳細なハンドリング実装',
        });
      }

      this.handleExecutionError(error);
    }
  }

  /**
   * 実際の置換処理実行
   */
  async executeReplacement(config) {
    try {
      // IPC経由で置換処理を実行
      console.log('🔍 Debug: Calling IPC executeReplacement with config:', {
        targetFolder: config.targetFolder,
        extensions: config.extensions,
        rulesCount: config.rules?.length,
        options: config.options,
      });

      const result = await window.electronAPI.executeReplacement({
        targetFolder: config.targetFolder, // 後方互換
        targetFolders: config.targetFolders, // 複数フォルダ
        extensions: config.extensions,
        rules: config.rules,
        targetOptions: config.targetOptions,
        options: config.options,
      });

      console.log('🔍 Debug: IPC executeReplacement result:', {
        success: result?.success,
        stats: result?.stats,
        resultsCount: result?.results?.length,
        error: result?.error,
      });

      if (result.success) {
        // 統計情報を更新
        this.stats = {
          totalFiles: result.stats.totalFiles || 0,
          processedFiles: result.stats.processedFiles || 0,
          changedFiles: result.stats.changedFiles || 0,
          renamedFiles: result.stats.renamedFiles || 0,
          totalChanges: result.stats.totalChanges || 0,
          errors: result.stats.errors || 0,
        };

        // 結果を保存
        this.results = result.results || [];

        // 完了処理
        if (result.cancelled) {
          this.finishStoppedExecution();
        } else {
          this.completeExecution();
        }
      } else {
        throw new Error(result.error || '置換処理に失敗しました');
      }
    } catch (error) {
      console.error('❌ Replacement execution failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      });

      this.handleExecutionError(error);
    }
  }

  /**
   * 進捗更新
   */
  updateProgress() {
    const percentage =
      this.stats.totalFiles > 0 ? (this.stats.processedFiles / this.stats.totalFiles) * 100 : 0;

    // 進捗バー更新
    this.elements.progressBar.style.width = `${percentage}%`;
    this.elements.progressPercent.textContent = `${Math.round(percentage)}%`;
    this.elements.progressCurrent.textContent = this.stats.processedFiles;
    this.elements.progressTotal.textContent = this.stats.totalFiles;
    this.elements.changesMade.textContent = this.stats.totalChanges;
  }

  /**
   * 進捗モーダル表示
   */
  showProgressModal() {
    this.elements.progressModal?.classList.remove('hidden');
    this.updateProgress();

    // アニメーション
    requestAnimationFrame(() => {
      this.elements.progressModal?.classList.add('show');
    });
  }

  /**
   * タイマー開始
   */
  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.startTime) {
        const elapsed = Date.now() - this.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        this.elements.elapsedTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds
          .toString()
          .padStart(2, '0')}`;
      }
    }, 1000);
  }

  /**
   * タイマー停止
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * 実行ボタン状態更新
   * UI応答性100ms以内保証
   */
  updateExecuteButtonState(state) {
    const button = this.elements.executeButton;
    if (!button) {
      return;
    }

    const startTime = performance.now();

    switch (state) {
      case 'idle':
        button.disabled = false;
        button.innerHTML = `
                    <span class="button-icon">🚀</span>
                    Execute Replacement
                `;
        button.classList.remove('executing');
        break;
      case 'executing':
        button.disabled = true;
        button.innerHTML = `
                    <span class="button-icon">⚙️</span>
                    Executing...
                `;
        button.classList.add('executing');
        break;
      default:
        console.warn(`Unknown button state: ${state}`);
        break;
    }

    const responseTime = performance.now() - startTime;

    const RESPONSE_WARNING_THRESHOLD = 50; // ms
    if (window.vibeLogger && responseTime > RESPONSE_WARNING_THRESHOLD) {
      window.vibeLogger.warning('button_update_slow', '実行ボタン更新遅延', {
        context: {
          responseTime,
          state,
          targetAchieved: responseTime <= 100,
        },
        aiTodo: 'ボタン状態更新の最適化が必要',
      });
    }
  }

  /**
   * Pause / Stop ボタンを初期状態に戻す
   */
  resetProgressButtons() {
    this.setProgressButtonsDisabled(false);
    this.elements.pauseButton.innerHTML = `
                <span class="button-icon">⏸️</span>
                Pause
            `;
  }

  /**
   * Pause / Stop ボタンの有効・無効を切り替える
   */
  setProgressButtonsDisabled(disabled) {
    this.elements.pauseButton.disabled = disabled;
    this.elements.stopButton.disabled = disabled;
  }

  /**
   * 一時停止ボタンハンドラー
   * 処理中のファイルは完了させ、次の区切りで待機する
   */
  async handlePauseClick(event) {
    event.preventDefault();

    if (this.state === 'executing') {
      this.state = 'pausing';
      await window.electronAPI.pauseReplacement();
      this.elements.pauseButton.innerHTML = `
                <span class="button-icon">▶️</span>
                Resume
            `;

      if (window.vibeLogger) {
        window.vibeLogger.info('execution_paused', '実行一時停止', {
          context: {
            processedFiles: this.stats.processedFiles,
            totalFiles: this.stats.totalFiles,
          },
        });
      }
    } else if (this.state === 'pausing') {
      this.state = 'executing';
      await window.electronAPI.resumeReplacement();
      this.elements.pauseButton.innerHTML = `
                <span class="button-icon">⏸️</span>
                Pause
            `;

      if (window.vibeLogger) {
        window.vibeLogger.info('execution_resumed', '実行再開', {
          context: {
            processedFiles: this.stats.processedFiles,
            totalFiles: this.stats.totalFiles,
          },
        });
      }
    }
  }

  /**
   * 停止ボタンハンドラー
   */
  handleStopClick(event) {
    event.preventDefault();

    if (this.state !== 'executing' && this.state !== 'pausing') {
      return;
    }

    // confirm()をカスタムダイアログで置き換え
    this.showStopConfirmationDialog().then(confirmed => {
      if (confirmed) {
        this.stopExecution();
      }
    });
  }

  /**
   * 停止確認ダイアログ
   */
  async showStopConfirmationDialog() {
    return new Promise(resolve => {
      const dialog = document.createElement('div');
      dialog.className = 'confirmation-dialog';
      dialog.innerHTML = `
                <div class="dialog-overlay">
                    <div class="dialog-content">
                        <h3 class="dialog-title">
                            <span class="dialog-icon">⚠️</span>
                            実行停止の確認
                        </h3>
                        <div class="dialog-message">実行を停止しますか？<br><br>処理済みの変更は保持されますが、未処理のファイルは変更されません。</div>
                        <div class="dialog-actions">
                            <button class="dialog-button secondary" id="stopDialogCancel">
                                <span class="button-icon">↩️</span>
                                継続
                            </button>
                            <button class="dialog-button primary" id="stopDialogConfirm">
                                <span class="button-icon">🛑</span>
                                停止
                            </button>
                        </div>
                    </div>
                </div>
            `;

      // スタイル適用（既存のスタイルを再利用）
      document.body.appendChild(dialog);

      // ボタンイベント
      const cancelButton = dialog.querySelector('#stopDialogCancel');
      const confirmButton = dialog.querySelector('#stopDialogConfirm');

      const cleanup = () => {
        if (dialog && dialog.parentNode === document.body) {
          document.body.removeChild(dialog);
        }
      };

      cancelButton.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      confirmButton.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      // フォーカス
      setTimeout(() => cancelButton.focus(), 100);
    });
  }

  /**
   * 実行停止を要求する
   * 実際の終了はメインプロセスの応答を受けた finishStoppedExecution() で行う
   */
  async stopExecution() {
    if (this.state !== 'executing' && this.state !== 'pausing') {
      return;
    }

    const previousState = this.state;
    this.state = 'stopping';
    this.setProgressButtonsDisabled(true);
    this.elements.currentFile.textContent = '停止しています…';

    try {
      await window.electronAPI.cancelReplacement();
    } catch (error) {
      this.state = previousState;
      this.setProgressButtonsDisabled(false);
      this.showErrorMessage('停止エラー', error.message);
    }
  }

  /**
   * 停止された実行の終了処理（部分結果を表示）
   */
  finishStoppedExecution() {
    this.state = 'idle';
    this.stopTimer();

    if (window.vibeLogger) {
      window.vibeLogger.info('execution_stopped', '実行停止', {
        context: {
          processedFiles: this.stats.processedFiles,
          totalFiles: this.stats.totalFiles,
          completionRate:
            this.stats.totalFiles > 0
              ? ((this.stats.processedFiles / this.stats.totalFiles) * 100).toFixed(1)
              : 0,
        },
        humanNote: 'ユーザーが実行を手動停止',
      });
    }

    // 進捗モーダルを閉じる
    this.hideProgressModal();

    // 実行ボタンを元に戻す
    this.updateExecuteButtonState('idle');

    // 部分的な結果を表示
    this.showPartialResults();
  }

  /**
   * 実行完了
   */
  completeExecution() {
    this.state = 'completed';
    this.stopTimer();
    if (this.defaultResultTitle) {
      this.elements.resultTitle.innerHTML = this.defaultResultTitle;
    }

    const executionTime = this.startTime ? Date.now() - this.startTime : 0;

    if (window.vibeLogger) {
      window.vibeLogger.info('execution_completed', '置換処理完了', {
        context: {
          executionTime,
          totalFiles: this.stats.totalFiles,
          processedFiles: this.stats.processedFiles,
          changedFiles: this.stats.changedFiles,
          totalChanges: this.stats.totalChanges,
          errors: this.stats.errors,
        },
        humanNote: '置換処理が正常に完了',
      });
    }

    // 進捗モーダルを閉じる
    this.hideProgressModal();

    // 実行ボタンを元に戻す
    this.updateExecuteButtonState('idle');

    // 結果を表示
    this.showResults();
  }

  /**
   * 進捗モーダル非表示
   */
  hideProgressModal() {
    this.elements.progressModal?.classList.remove('show');
    setTimeout(() => {
      this.elements.progressModal?.classList.add('hidden');
    }, 300);
  }

  /**
   * 結果表示
   */
  showResults() {
    const executionTime = this.startTime ? Date.now() - this.startTime : 0;
    const minutes = Math.floor(executionTime / 60000);
    const seconds = Math.floor((executionTime % 60000) / 1000);
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;

    // サマリー更新
    const summaryParts = [
      `${this.stats.changedFiles} files modified with ${this.stats.totalChanges} total changes`,
    ];
    if (this.stats.renamedFiles > 0) {
      summaryParts.push(`${this.stats.renamedFiles} files renamed`);
    }
    if (this.stats.errors > 0) {
      summaryParts.push(`${this.stats.errors} errors`);
    }
    this.elements.resultSummary.textContent = summaryParts.join(', ');
    this.elements.completionTime.textContent = timeString;

    // 詳細結果（実結果から生成。タブ区切り・選択コピー可能なテキスト）
    this.elements.resultDetails.innerHTML = this.generateActualResults();

    // 結果モーダル表示
    this.elements.resultModal?.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.elements.resultModal?.classList.add('show');
    });
  }

  /**
   * 部分的な結果表示（停止時）
   */
  showPartialResults() {
    // タイトルを部分完了に変更（次回の完了時に元へ戻す）
    this.defaultResultTitle = this.defaultResultTitle || this.elements.resultTitle.innerHTML;
    this.elements.resultTitle.innerHTML = `
            <span class="warning-icon">⚠️</span>
            Replacement Partially Completed
        `;

    this.showResults();
  }

  /**
   * 実結果から行データを生成（表示・コピー・CSV 共通のデータ源）
   * @returns {Array<{path:string,changes:number,rule:string,from:string,to:string,count:number}>}
   */
  buildResultRows() {
    const rows = [];
    (this.results || []).forEach(file => {
      if (!(file.modified || (file.changes || 0) > 0 || file.renameError)) {
        return;
      }
      const changes = file.changes || 0;
      const hasRenameRow = Boolean(file.renamedTo || file.renameError);
      const hasDetails = file.details && file.details.length > 0;
      const details =
        hasDetails || hasRenameRow
          ? file.details || []
          : [{ rule: '', from: '', to: '', count: changes }];
      details.forEach(d => {
        rows.push({
          path: file.path || 'Unknown file',
          changes,
          rule: d.rule || (d.from !== undefined ? `${d.from} → ${d.to}` : ''),
          from: d.from != null ? d.from : '',
          to: d.to != null ? d.to : '',
          count: d.count || 0,
        });
      });
      if (hasRenameRow) {
        rows.push(this.buildRenameRow(file, changes, details));
      }
    });
    return rows;
  }

  /**
   * リネーム結果の行データを生成（成功・失敗の両方を1行で表す）
   */
  buildRenameRow(file, changes, details) {
    const baseName = filePath => filePath.split(/[\\/]/).pop();
    const from = baseName(file.path);
    const to = file.renamedTo ? baseName(file.renamedTo) : file.attemptedName;
    const contentCount = details.reduce((sum, d) => sum + (d.count || 0), 0);
    return {
      path: file.path,
      changes,
      rule: file.renamedTo
        ? `[リネーム] ${from} → ${to}`
        : `[リネーム失敗] ${from} → ${to}: ${file.renameError}`,
      from,
      to,
      count: file.renamedTo ? changes - contentCount : 0,
      error: file.renameError || '',
    };
  }

  /**
   * 結果テキスト行（タブ区切り・表示とコピーで共通）
   * 例: ✅\t/path/file.php\t(5 changes)\tA → B (5 occurrences)
   */
  buildResultTextLines() {
    return this.buildResultRows().map(r => {
      if (r.error) {
        return `❌\t${r.path}\t(${r.changes} changes)\t${r.rule}`;
      }
      const occ = `${r.count} occurrence${r.count !== 1 ? 's' : ''}`;
      return `✅\t${r.path}\t(${r.changes} changes)\t${r.rule} (${occ})`;
    });
  }

  /**
   * 実際の結果を生成（等幅・タブ区切り・選択コピー可能な <pre>）
   */
  generateActualResults() {
    const lines = this.buildResultTextLines();
    if (lines.length === 0) {
      return '<pre class="result-text">（変更されたファイルはありません）</pre>';
    }
    return `<pre class="result-text">${this.escapeHtml(lines.join('\n'))}</pre>`;
  }

  /**
   * 結果モーダルを閉じる
   */
  closeResultModal() {
    this.elements.resultModal?.classList.remove('show');
    setTimeout(() => {
      this.elements.resultModal?.classList.add('hidden');
    }, 300);

    if (window.vibeLogger) {
      window.vibeLogger.info('result_modal_closed', '結果モーダル閉じる', {
        context: {
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * 結果エクスポート
   */
  async handleExportResults(event) {
    event.preventDefault();

    try {
      if (window.vibeLogger) {
        window.vibeLogger.info('export_results_start', '結果エクスポート開始', {
          context: {
            changedFiles: this.stats.changedFiles,
            totalChanges: this.stats.totalChanges,
          },
        });
      }

      // モック CSV データ生成
      const csvData = this.generateCSVResults();

      // ダウンロード実行
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      const ISO_DATETIME_LENGTH = 19; // YYYY-MM-DDTHH:MM:SS
      a.download = `replacement-results-${new Date()
        .toISOString()
        .slice(0, ISO_DATETIME_LENGTH)
        .replace(/:/g, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 成功通知
      this.showSuccessMessage('結果をCSVファイルでエクスポートしました');
    } catch (error) {
      if (window.vibeLogger) {
        window.vibeLogger.error('export_results_error', '結果エクスポートエラー', {
          context: {
            error: error.message,
            stack: error.stack,
          },
        });
      }

      this.showErrorMessage('エクスポートエラー', error.message);
    }
  }

  /**
   * CSV結果生成
   */
  generateCSVResults() {
    const headers = ['File Path', 'Changes Count', 'From', 'To', 'Occurrences', 'Error'];

    // 実結果から行を生成（同一ファイルの2行目以降は Changes Count を空欄に）
    const rows = [];
    let lastPath = null;
    this.buildResultRows().forEach(r => {
      const changesCell = r.path === lastPath ? '' : String(r.changes);
      lastPath = r.path;
      rows.push([r.path, changesCell, r.from, r.to, String(r.count), r.error || '']);
    });

    return [headers, ...rows]
      .map(row => row.map(ExecutionController.escapeCsvCell).join(','))
      .join('\n');
  }

  /**
   * CSVセルのエスケープ（RFC4180準拠）
   * ファイル名や内容が表計算ソフトで数式として評価されないよう、先頭に ' を付ける
   */
  static escapeCsvCell(cell) {
    const text = String(cell);
    const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  }

  /**
   * サマリーコピー
   */
  async handleCopySummary(event) {
    event.preventDefault();

    try {
      const summary = this.generateTextSummary();

      await navigator.clipboard.writeText(summary);
      this.showSuccessMessage('サマリーをクリップボードにコピーしました');

      if (window.vibeLogger) {
        window.vibeLogger.info('summary_copied', 'サマリーコピー', {
          context: {
            summaryLength: summary.length,
          },
        });
      }
    } catch (error) {
      if (window.vibeLogger) {
        window.vibeLogger.error('copy_summary_error', 'サマリーコピーエラー', {
          context: {
            error: error.message,
          },
        });
      }

      // フォールバック: テキストエリアで選択
      this.fallbackCopy(this.generateTextSummary());
    }
  }

  /**
   * テキストサマリー生成
   */
  generateTextSummary() {
    // 表示と同一のタブ区切りテキスト（実結果）をコピー対象にする
    return this.buildResultTextLines().join('\n');
  }

  /**
   * フォールバックコピー
   */
  fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      this.showSuccessMessage('サマリーをクリップボードにコピーしました');
    } catch (error) {
      this.showErrorMessage('コピーエラー', 'クリップボードへのコピーに失敗しました');
    } finally {
      document.body.removeChild(textarea);
    }
  }

  /**
   * 実行エラーハンドリング
   */
  handleExecutionError(error) {
    this.state = 'error';
    this.stopTimer();
    this.hideProgressModal();
    this.updateExecuteButtonState('idle');

    this.showErrorMessage('実行エラー', error.message);
  }

  /**
   * 成功メッセージ表示
   */
  showSuccessMessage(message) {
    this.showToast(message, 'success');
  }

  /**
   * エラーメッセージ表示
   */
  showErrorMessage(title, message) {
    this.showToast(`${title}: ${message}`, 'error');
  }

  /**
   * トースト通知表示
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
            <span class="toast-icon">${
              type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'
            }</span>
            <span class="toast-message"></span>
        `;
    // ファイル名を含むためHTMLとして解釈させない
    toast.querySelector('.toast-message').textContent = message;

    // スタイル
    const style = document.createElement('style');
    style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--bg-primary);
                color: var(--text-primary);
                border: 2px solid var(--border-primary);
                border-radius: 8px;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 9999;
                max-width: 400px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
                animation: slideIn 0.3s ease;
            }
            .toast-success { border-color: #22c55e; background: #f0fdf4; color: #166534; }
            .toast-error { border-color: #ef4444; background: #fef2f2; color: #991b1b; }
            .toast-info { border-color: #3b82f6; background: #eff6ff; color: #1e40af; }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;

    document.head.appendChild(style);
    document.body.appendChild(toast);

    // 3秒後に自動削除
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        document.body.removeChild(toast);
        document.head.removeChild(style);
      }, 300);
    }, 3000);
  }

  /**
   * 実行状態取得
   */
  getState() {
    return this.state;
  }

  /**
   * 統計情報取得
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * HTMLエスケープヘルパー
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  /**
   * クリーンアップ
   */
  destroy() {
    this.stopTimer();

    if (window.vibeLogger) {
      window.vibeLogger.info('execution_controller_destroyed', 'ExecutionController破棄', {
        context: {
          timestamp: new Date().toISOString(),
          finalState: this.state,
        },
      });
    }
  }
}

// グローバルに公開（他のスクリプトから参照可能）
window.ExecutionController = ExecutionController;
