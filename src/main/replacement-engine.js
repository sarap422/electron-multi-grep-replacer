/**
 * replacement-engine.js - 高性能置換処理エンジン
 *
 * 複数ファイルに対して複数の置換ルールを順次適用する置換エンジン
 * EventEmitterベースで進捗通知をリアルタイムに提供
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const DebugLogger = require('./debug-logger');
const { decodeRule, splitNameTarget, validateNewName } = require('./target-options');

// 定数定義
const DEFAULT_ENCODING = 'utf8';
const MAX_CONCURRENT_FILES = 10;
const PROGRESS_UPDATE_INTERVAL = 100; // ms

class ReplacementEngine extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      caseSensitive: true,
      encoding: DEFAULT_ENCODING,
      backupEnabled: false,
      dryRun: false,
      maxConcurrency: MAX_CONCURRENT_FILES,
      progressUpdateInterval: PROGRESS_UPDATE_INTERVAL,
      ...options,
    };

    // 統計情報
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      modifiedFiles: 0,
      renamedFiles: 0,
      totalReplacements: 0,
      errors: [],
      results: [],
    };

    // 実行単位の対象オプション（processFiles ごとに再設定）
    this.targetOptions = {};

    // 処理状態
    this.isProcessing = false;
    this.runActive = false;
    this.cancelRequested = false;
    this.isPaused = false;
    this.releasePause = null;
    this.lastProgressUpdate = 0;
  }

  /**
   * 実行の開始を宣言する
   * ファイル検索の段階から停止・一時停止を受け付けるため、processFiles より前に呼べる
   */
  prepareRun() {
    this.runActive = true;
    this.cancelRequested = false;
    this.isPaused = false;
    this.releasePause = null;
  }

  /**
   * 複数ファイルを一括処理
   * @param {string[]} files 対象ファイルパス
   * @param {Array} rules 置換ルール
   * @param {object} targetOptions { includeFileName, includeExtension, interpretEscapes }
   * @returns {Promise<object>} 停止された場合は cancelled: true と部分結果を返す
   */
  async processFiles(files, rules, targetOptions = {}) {
    if (this.isProcessing) {
      throw new Error('Processing already in progress');
    }

    // 処理開始
    const processId = `replace-${Date.now()}`;
    const startTime = Date.now();
    this.isProcessing = true;
    if (!this.runActive) {
      this.prepareRun();
    }
    this._resetStats();
    this.stats.totalFiles = files.length;
    this.targetOptions = targetOptions;

    await DebugLogger.info('Replacement processing started', {
      processId,
      totalFiles: files.length,
      totalRules: rules.filter(r => r.enabled !== false).length,
      options: this.options,
    });

    // パフォーマンス測定開始
    await DebugLogger.startPerformance(processId);

    try {
      // 処理開始イベント
      this.emit('start', {
        processId,
        totalFiles: files.length,
        totalRules: rules.length,
      });

      // 有効なルールのみフィルタ
      const activeRules = rules
        .filter(rule => rule.enabled !== false)
        .map(rule => decodeRule(rule, targetOptions.interpretEscapes));
      if (activeRules.length === 0) {
        throw new Error('No active replacement rules');
      }

      // バッチ処理で実行
      await this._processBatch(files, activeRules, processId);

      // ファイル名・拡張子の置換（内容置換の完了後に実行）
      await this._renameFiles(activeRules);

      // 最終進捗を100%で送信
      this.emit('progress', {
        processId,
        processedFiles: this.stats.processedFiles,
        totalFiles: this.stats.totalFiles,
        modifiedFiles: this.stats.modifiedFiles,
        totalReplacements: this.stats.totalReplacements,
        percentage: 100,
      });

      // 処理完了
      const performanceResult = await DebugLogger.endPerformance(processId);
      const duration = Math.max(performanceResult?.duration || Date.now() - startTime, 1);

      await DebugLogger.info('Replacement processing completed', {
        processId,
        stats: this.stats,
        duration: `${duration}ms`,
        filesPerSecond: duration > 0 ? Math.round((files.length / duration) * 1000) : 0,
      });

      // 完了イベント
      this.emit('complete', {
        processId,
        stats: this.stats,
        duration,
      });

      return {
        success: true,
        cancelled: this.cancelRequested,
        stats: this.stats,
        results: this.stats.results,
        duration,
      };
    } catch (error) {
      await DebugLogger.error('Replacement processing failed', {
        processId,
        error: error.message,
        stats: this.stats,
      });

      this.emit('error', {
        processId,
        error: error.message,
      });

      throw error;
    } finally {
      this.isProcessing = false;
      this.runActive = false;
      this.isPaused = false;
    }
  }

  /**
   * 単一ファイルを処理
   */
  async processFile(filePath, rules) {
    const fileResult = {
      path: filePath,
      modified: false,
      replacements: 0,
      changes: 0, // UI表示用：変更総数
      details: [], // UI表示用：ルール別詳細
      error: null,
    };

    try {
      // ファイル読み込み
      const content = await fs.readFile(filePath, this.options.encoding);
      let modifiedContent = content;
      let totalReplacements = 0;

      // 各ルールを順次適用
      for (const rule of rules) {
        if (!rule.enabled && rule.enabled !== undefined) {
          continue;
        }

        const result = await this._applyRule(modifiedContent, rule);
        if (result.replacements > 0) {
          modifiedContent = result.content;
          totalReplacements += result.replacements;

          const from = rule.rawFrom ?? rule.from;
          const to = rule.rawTo ?? rule.to;
          fileResult.details.push({
            rule: `${from} → ${to}`,
            from,
            to,
            count: result.replacements,
          });
        }
      }

      // replacements数を設定（dryRunでも）
      if (totalReplacements > 0) {
        fileResult.replacements = totalReplacements;
        fileResult.changes = totalReplacements; // UI表示用

        // 実際のファイル更新はdryRunでない場合のみ
        if (!this.options.dryRun) {
          await fs.writeFile(filePath, modifiedContent, this.options.encoding);
          fileResult.modified = true;
          this.stats.modifiedFiles++;
        }

        this.stats.totalReplacements += totalReplacements;
      }

      await DebugLogger.debug('File processed', {
        path: filePath,
        modified: fileResult.modified,
        replacements: totalReplacements,
      });
    } catch (error) {
      fileResult.error = error.message;
      this.stats.errors.push({
        path: filePath,
        error: error.message,
      });

      await DebugLogger.warn('File processing failed', {
        path: filePath,
        error: error.message,
      });
    }

    return fileResult;
  }

  /**
   * 置換プレビューを生成
   */
  async generatePreview(files, rules, limit = 10) {
    const previewResults = [];
    const activeRules = rules.filter(rule => rule.enabled !== false);

    // 最初のN個のファイルのみプレビュー
    const previewFiles = files.slice(0, limit);

    for (const filePath of previewFiles) {
      try {
        const content = await fs.readFile(filePath, this.options.encoding);
        const preview = {
          path: filePath,
          changes: [],
        };

        // 各ルールのプレビュー
        for (const rule of activeRules) {
          const matches = this._findMatches(content, rule);
          if (matches.length > 0) {
            preview.changes.push({
              rule: `${rule.from} → ${rule.to}`,
              matches: matches.slice(0, 3), // 最初の3つのマッチのみ
              totalCount: matches.length,
            });
          }
        }

        if (preview.changes.length > 0) {
          previewResults.push(preview);
        }
      } catch (error) {
        // プレビューエラーは無視
        await DebugLogger.debug('Preview generation failed', {
          path: filePath,
          error: error.message,
        });
      }
    }

    return previewResults;
  }

  /**
   * 処理をキャンセル（処理中のファイルは完了させ、次の区切りで止まる）
   */
  cancelProcessing() {
    if (!this.runActive) {
      return false;
    }
    this.cancelRequested = true;
    this._releasePause();
    this.emit('cancelled');
    return true;
  }

  /**
   * 処理を一時停止（処理中のファイルは完了させ、次の区切りで待機する）
   */
  pauseProcessing() {
    if (!this.runActive) {
      return false;
    }
    this.isPaused = true;
    return true;
  }

  /**
   * 一時停止を解除
   */
  resumeProcessing() {
    if (!this.runActive) {
      return false;
    }
    this._releasePause();
    return true;
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 処理の区切りで呼ぶ。一時停止中は再開まで待機し、停止されていれば false を返す
   */
  async _canContinue() {
    if (this.isPaused && !this.cancelRequested) {
      await new Promise(resolve => {
        this.releasePause = resolve;
      });
    }
    return !this.cancelRequested;
  }

  /**
   * 一時停止の待機を解除
   */
  _releasePause() {
    this.isPaused = false;
    if (this.releasePause) {
      this.releasePause();
      this.releasePause = null;
    }
  }

  /**
   * バッチ処理の実装
   */
  async _processBatch(files, rules, processId) {
    const results = [];
    const batchSize = this.options.maxConcurrency;

    for (let i = 0; i < files.length; i += batchSize) {
      if (!(await this._canContinue())) {
        break;
      }

      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(async filePath => {
        const result = await this.processFile(filePath, rules);
        this.stats.processedFiles++;
        this.stats.results.push(result);

        // 進捗通知（throttle）
        this._emitProgress(processId);

        return result;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 対象ファイルのファイル名・拡張子を置換する
   * 同名への変更で上書きが起きないよう、並列にせず1件ずつ処理する
   */
  async _renameFiles(rules) {
    if (!splitNameTarget('', this.targetOptions)) {
      return;
    }

    const seenPaths = new Set();
    for (const fileResult of this.stats.results) {
      if (!(await this._canContinue())) {
        break;
      }
      if (fileResult.error || seenPaths.has(fileResult.path)) {
        continue;
      }
      seenPaths.add(fileResult.path);
      await this._renameFile(fileResult, rules);
    }
  }

  /**
   * 単一ファイルのリネーム（失敗は fileResult.renameError に記録し、処理は継続）
   */
  async _renameFile(fileResult, rules) {
    const oldPath = fileResult.path;
    const oldName = path.basename(oldPath);
    const { prefix, target, suffix } = splitNameTarget(oldName, this.targetOptions);

    let newTarget = target;
    let count = 0;
    for (const rule of rules) {
      const result = await this._applyRule(newTarget, rule);
      newTarget = result.content;
      count += result.replacements;
    }

    const newName = `${prefix}${newTarget}${suffix}`;
    if (count === 0 || newName === oldName || this.options.dryRun) {
      return;
    }

    try {
      const invalidReason = validateNewName(oldName, newName);
      if (invalidReason) {
        throw new Error(invalidReason);
      }

      const newPath = path.join(path.dirname(oldPath), newName);
      if (await this._isOccupied(oldPath, newPath)) {
        throw new Error(`同名のファイルが既に存在します: ${newName}`);
      }
      await fs.rename(oldPath, newPath);

      fileResult.renamedTo = newPath;
      fileResult.replacements += count;
      fileResult.changes += count;
      if (!fileResult.modified) {
        fileResult.modified = true;
        this.stats.modifiedFiles++;
      }
      this.stats.renamedFiles++;
      this.stats.totalReplacements += count;
    } catch (error) {
      fileResult.renameError = error.message;
      fileResult.attemptedName = newName;
      this.stats.errors.push({ path: oldPath, error: error.message });

      await DebugLogger.warn('File rename failed', {
        path: oldPath,
        newName,
        error: error.message,
      });
    }
  }

  /**
   * 変更先が別のファイルで使用中か判定する
   * 大文字小文字のみの変更は、大小無視のファイルシステムでは同一ファイルを指すため使用中としない
   */
  async _isOccupied(oldPath, newPath) {
    try {
      const [oldStat, newStat] = await Promise.all([fs.lstat(oldPath), fs.lstat(newPath)]);
      return oldStat.ino !== newStat.ino || oldStat.dev !== newStat.dev;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * 単一ルールを適用
   */
  async _applyRule(content, rule) {
    const { from, to } = rule;

    // Case sensitive setting - use global options if rule doesn't have its own
    const caseSensitive =
      rule.caseSensitive !== undefined ? rule.caseSensitive : this.options.caseSensitive;
    const flags = caseSensitive ? 'g' : 'gi';

    // エスケープ処理（正規表現特殊文字）
    const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedFrom, flags);

    let replacements = 0;
    const newContent = content.replace(regex, () => {
      replacements++;
      return to;
    });

    return {
      content: newContent,
      replacements,
    };
  }

  /**
   * マッチ箇所を検索（プレビュー用）
   */
  _findMatches(content, rule) {
    const { from } = rule;
    // Case sensitive setting - use rule-level setting if available, otherwise global setting
    const caseSensitive =
      rule.caseSensitive !== undefined ? rule.caseSensitive : this.options.caseSensitive;
    const flags = caseSensitive ? 'g' : 'gi';
    const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedFrom, flags);

    const matches = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      const lineStart = content.lastIndexOf('\n', match.index) + 1;
      const lineEnd = content.indexOf('\n', match.index);
      const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
      const lineNumber = content.substring(0, match.index).split('\n').length;

      matches.push({
        line: lineNumber,
        column: match.index - lineStart,
        context: line.trim(),
      });
    }

    return matches;
  }

  /**
   * 進捗通知（throttle付き）
   */
  _emitProgress(processId) {
    const now = Date.now();
    if (now - this.lastProgressUpdate >= this.options.progressUpdateInterval) {
      this.lastProgressUpdate = now;

      this.emit('progress', {
        processId,
        processedFiles: this.stats.processedFiles,
        totalFiles: this.stats.totalFiles,
        modifiedFiles: this.stats.modifiedFiles,
        totalReplacements: this.stats.totalReplacements,
        percentage: Math.round((this.stats.processedFiles / this.stats.totalFiles) * 100),
      });
    }
  }

  /**
   * 統計情報をリセット
   */
  _resetStats() {
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      modifiedFiles: 0,
      renamedFiles: 0,
      totalReplacements: 0,
      errors: [],
      results: [],
    };
  }
}

module.exports = ReplacementEngine;
