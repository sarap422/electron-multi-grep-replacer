/**
 * window-security.js - ウィンドウの遷移制限とIPC送信元の検証（Task 1102.2）
 *
 * preload の API を持つウィンドウが外部ページへ移動しないよう制限し、
 * 自分の index.html 以外からの IPC を拒否する。
 * Electron に依存しないため、起動せずにテストできる。
 */
const path = require('path');
const { fileURLToPath } = require('url');

/**
 * 比較用にパスを正規化する（macOS の濁点の表現と Windows の大文字小文字の差を吸収）
 */
function normalizePath(filePath) {
  const normalized = path.resolve(filePath).normalize('NFC');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

/**
 * URL がアプリ自身の HTML を指すか判定する
 * エンコードの表記揺れで誤判定しないよう、URL をパスへ戻して比較する
 */
function isAppUrl(url, appHtmlPath) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'file:') {
      return false;
    }
    return normalizePath(fileURLToPath(parsed)) === normalizePath(appHtmlPath);
  } catch (error) {
    return false;
  }
}

/**
 * IPC の送信元がアプリ自身のページか判定する
 */
function isTrustedSender(event, appHtmlPath) {
  const url = event.senderFrame?.url;
  return typeof url === 'string' && isAppUrl(url, appHtmlPath);
}

/**
 * アプリのページ以外への遷移と、新しいウィンドウの作成を拒否する
 * @param {object} webContents 対象の webContents
 * @param {string} appHtmlPath アプリの index.html の絶対パス
 * @param {function(string, string): void} onBlocked 拒否したときの通知（種類, URL）
 */
function applyWindowSecurity(webContents, appHtmlPath, onBlocked) {
  webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url, appHtmlPath)) {
      event.preventDefault();
      onBlocked('navigation', url);
    }
  });

  webContents.setWindowOpenHandler(({ url }) => {
    onBlocked('window-open', url);
    return { action: 'deny' };
  });
}

module.exports = { isAppUrl, isTrustedSender, applyWindowSecurity };
