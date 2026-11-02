/**
 * target-options.js - 置換・検索の対象オプション（Task 1102.1）
 *
 * ReplacementEngine と GrepEngine が共有する純粋関数。
 * - エスケープ解釈: \n \t \r \\ を制御文字に変換（未知のエスケープはそのまま）
 * - ファイル名の対象範囲: { includeFileName, includeExtension } に応じて名前を分割
 * - 変更後ファイル名の検証: パス区切りや制御文字を含む名前を拒否
 */
const path = require('path');

const ESCAPE_CHARS = { n: '\n', t: '\t', r: '\r', '\\': '\\' };
// eslint-disable-next-line no-control-regex
const INVALID_NAME_CHARS = /[/\\\u0000-\u001f]/;

/**
 * エスケープシーケンスを解釈する
 * 左から1回の走査で変換するため、\\n は「バックスラッシュ + n」になる
 */
function decodeEscapes(text) {
  return text.replace(/\\([ntr\\])/g, (match, char) => ESCAPE_CHARS[char]);
}

/**
 * ルールの from/to を実行用に変換する（rawFrom/rawTo は結果表示用の入力値）
 */
function decodeRule(rule, interpretEscapes) {
  return {
    ...rule,
    from: interpretEscapes ? decodeEscapes(rule.from) : rule.from,
    to: interpretEscapes ? decodeEscapes(rule.to) : rule.to,
    rawFrom: rule.from,
    rawTo: rule.to,
  };
}

/**
 * ファイル名を「対象部分」と前後の固定部分に分割する
 * @param {string} baseName ディレクトリを含まないファイル名
 * @param {{includeFileName?:boolean, includeExtension?:boolean}} options
 * @returns {{prefix:string, target:string, suffix:string}|null} 対象外なら null
 */
function splitNameTarget(baseName, options = {}) {
  const { includeFileName, includeExtension } = options;
  if (!includeFileName && !includeExtension) {
    return null;
  }
  if (includeFileName && includeExtension) {
    return { prefix: '', target: baseName, suffix: '' };
  }
  const ext = path.extname(baseName);
  const stem = baseName.slice(0, baseName.length - ext.length);
  return includeFileName
    ? { prefix: '', target: stem, suffix: ext }
    : { prefix: stem, target: ext, suffix: '' };
}

/**
 * 変更後のファイル名を検証する
 * @returns {string|null} 問題があればエラーメッセージ、なければ null
 */
function validateNewName(oldName, newName) {
  if (newName === '' || newName === '.' || newName === '..') {
    return 'ファイル名が空または不正になります';
  }
  if (INVALID_NAME_CHARS.test(newName)) {
    return 'ファイル名に使用できない文字（パス区切り・制御文字）が含まれます';
  }
  if (newName.startsWith('.') && !oldName.startsWith('.')) {
    return 'ファイル名が消えて隠しファイルになります';
  }
  return null;
}

module.exports = { decodeEscapes, decodeRule, splitNameTarget, validateNewName };
