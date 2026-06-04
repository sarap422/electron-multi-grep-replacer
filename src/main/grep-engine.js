/**
 * GrepEngine - 内容検索（Grep）エンジン
 *
 * ファイル群の内容をリテラル検索し、マッチを {file, line, col, context} で返す。
 * 既存の file-search-engine.js（ファイル列挙）とは責務を分離した内容検索専用モジュール。
 *
 * 設計の要点（Task 0604.4）:
 * - context は「行全体」ではなく「マッチを中心にした文字ウィンドウ」を返す。
 *   これにより min 化された1行（数千文字）でもマッチ周辺だけを表示できる。
 * - extractContext / findMatches は純粋関数（static）でテスト可能。
 */
const EventEmitter = require('events');
const fs = require('fs').promises;

const REGEX_META = /[.*+?^${}()|[\]\\]/g;
const ELLIPSIS = '…';

class GrepEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxFileSize = options.maxFileSize || 100 * 1024 * 1024; // 100MB
    this.maxResults = options.maxResults || 10000;
    this.contextMax = options.contextMax || 120;
    this.contextBefore = options.contextBefore || 30;
    this.cancelled = false;
  }

  cancel() {
    this.cancelled = true;
  }

  /**
   * マッチを中心にしたコンテキストウィンドウを抽出（純粋関数・テスト対象）
   * @param {string} line マッチを含む物理行（改行なし）
   * @param {number} relCol 行内のマッチ開始位置（0始まり）
   * @param {number} matchLen マッチ文字数
   * @returns {{text:string, hlStart:number, hlLen:number}}
   */
  static extractContext(line, relCol, matchLen, opts = {}) {
    const max = opts.max != null ? opts.max : 120;
    const before = opts.before != null ? opts.before : 30;
    const lineLen = line.length;

    let snippet;
    let snipStart;
    let lead = false;
    let trail = false;

    if (lineLen <= max) {
      // 短い行: 先頭・末尾の空白をtrimして全体表示
      const leadingWs = line.length - line.trimStart().length;
      snipStart = leadingWs;
      snippet = line.slice(leadingWs).replace(/\s+$/, '');
    } else {
      // 長い行: マッチ周辺のウィンドウを切り出す
      const winStart = Math.max(0, relCol - before);
      let winEnd = Math.min(lineLen, relCol + matchLen + (max - before - matchLen));
      if (winEnd < relCol + matchLen) {
        // マッチ自体が max より長い極端なケース
        winEnd = Math.min(lineLen, relCol + Math.min(matchLen, max));
      }
      snipStart = winStart;
      snippet = line.slice(winStart, winEnd);
      lead = winStart > 0;
      trail = winEnd < lineLen;
    }

    const text = (lead ? ELLIPSIS : '') + snippet + (trail ? ELLIPSIS : '');
    let hlStart = (lead ? 1 : 0) + (relCol - snipStart);
    let hlLen = matchLen;
    if (hlStart < 0) {
      hlLen += hlStart;
      hlStart = 0;
    }
    const coreEnd = text.length - (trail ? 1 : 0);
    if (hlStart + hlLen > coreEnd) {
      hlLen = Math.max(0, coreEnd - hlStart);
    }
    return { text, hlStart, hlLen };
  }

  /**
   * コンテンツ内のリテラル一致を全て検索（純粋関数・テスト対象）
   * @returns {Array<{line:number, col:number, text:string, hlStart:number, hlLen:number}>}
   */
  static findMatches(content, pattern, opts = {}) {
    if (!pattern) {
      return [];
    }
    const caseSensitive = opts.caseSensitive !== false; // 既定: 区別する
    const flags = caseSensitive ? 'g' : 'gi';
    const escaped = pattern.replace(REGEX_META, '\\$&');
    const regex = new RegExp(escaped, flags);
    const max = opts.contextMax != null ? opts.contextMax : 120;
    const before = opts.contextBefore != null ? opts.contextBefore : 30;
    const limit = opts.limit != null ? opts.limit : Infinity;

    const matches = [];
    let m;
    while ((m = regex.exec(content)) !== null) {
      const idx = m.index;
      const matchStr = m[0];
      const lineStart = content.lastIndexOf('\n', idx) + 1;
      const lineEnd = content.indexOf('\n', idx);
      const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
      const lineNumber = content.substring(0, idx).split('\n').length;
      const relCol = idx - lineStart;
      const ctx = GrepEngine.extractContext(line, relCol, matchStr.length, { max, before });
      matches.push({
        line: lineNumber,
        col: relCol + 1, // 1始まり（サクラエディタ準拠）
        text: ctx.text,
        hlStart: ctx.hlStart,
        hlLen: ctx.hlLen,
      });
      if (matchStr.length === 0) {
        regex.lastIndex++; // 空マッチによる無限ループ防止
      }
      if (matches.length >= limit) {
        break;
      }
    }
    return matches;
  }

  /**
   * ファイル群を内容検索（進捗イベント・キャンセル・件数上限対応）
   * @param {string[]} files 絶対パス配列
   * @param {string|string[]} patterns 検索文字列（リテラル）。配列ならOR検索
   * @param {object} options { caseSensitive }
   * @returns {Promise<{results:Array, stats:object}>}
   */
  async search(files, patterns, options = {}) {
    this.cancelled = false;
    const patternList = (Array.isArray(patterns) ? patterns : [patterns]).filter(
      p => typeof p === 'string' && p.length > 0
    );
    const results = [];
    const stats = {
      totalFiles: files.length,
      scannedFiles: 0,
      matchedFiles: 0,
      totalMatches: 0,
      skipped: 0,
      truncated: false,
      errors: [],
    };

    if (patternList.length === 0) {
      return { results, stats };
    }

    for (const filePath of files) {
      if (this.cancelled) {
        break;
      }
      stats.scannedFiles++;
      try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) {
          continue;
        }
        if (stat.size > this.maxFileSize) {
          stats.skipped++;
          continue;
        }
        const buf = await fs.readFile(filePath);
        if (GrepEngine._looksBinary(buf)) {
          stats.skipped++;
          continue;
        }
        const remaining = this.maxResults - stats.totalMatches;
        if (remaining <= 0) {
          stats.truncated = true;
          break;
        }
        const content = buf.toString('utf8');
        let fileMatches = [];
        for (const p of patternList) {
          fileMatches = fileMatches.concat(
            GrepEngine.findMatches(content, p, {
              caseSensitive: options.caseSensitive !== false,
              contextMax: this.contextMax,
              contextBefore: this.contextBefore,
              limit: remaining,
            })
          );
        }
        // 複数パターンの結果を出現順（行→列）に整列
        fileMatches.sort((a, b) => a.line - b.line || a.col - b.col);
        if (fileMatches.length > remaining) {
          fileMatches = fileMatches.slice(0, remaining);
          stats.truncated = true;
        }
        if (fileMatches.length > 0) {
          stats.matchedFiles++;
          stats.totalMatches += fileMatches.length;
          for (const fm of fileMatches) {
            results.push({ path: filePath, ...fm });
          }
          if (stats.totalMatches >= this.maxResults) {
            stats.truncated = true;
          }
        }
      } catch (err) {
        stats.errors.push({ path: filePath, error: err.message });
      }

      if (stats.scannedFiles % 10 === 0 || stats.scannedFiles === files.length) {
        this.emit('progress', {
          scannedFiles: stats.scannedFiles,
          totalFiles: stats.totalFiles,
          totalMatches: stats.totalMatches,
        });
      }
      if (stats.truncated) {
        break;
      }
    }

    return { results, stats };
  }

  /** 先頭8KBにNULバイトがあればバイナリ扱い */
  static _looksBinary(buf) {
    const len = Math.min(buf.length, 8192);
    for (let i = 0; i < len; i++) {
      if (buf[i] === 0) {
        return true;
      }
    }
    return false;
  }
}

module.exports = GrepEngine;
