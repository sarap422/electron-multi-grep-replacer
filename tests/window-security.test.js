/**
 * Task 1102.2: セキュリティレビュー対応のテスト
 * Electron を起動せずに、遷移制限・IPC送信元の検証・公開APIの範囲を検証する。
 */
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const { isAppUrl, isTrustedSender, applyWindowSecurity } = require('../src/main/window-security');

const SRC = path.join(__dirname, '../src');
const readSource = file => fs.readFileSync(path.join(SRC, file), 'utf8');

const PACKAGED_HTML =
  '/Applications/Multi Grep Replacer.app/Contents/Resources/app.asar/src/renderer/index.html';
const toUrl = filePath => pathToFileURL(filePath).href;
const rendererScripts = fs
  .readdirSync(path.join(SRC, 'renderer/js'))
  .filter(file => file.endsWith('.js'));

describe('isAppUrl', () => {
  test.each([
    ['パッケージ版のパス（空白を含む）', PACKAGED_HTML],
    ['日本語を含むパス', '/Volumes/作業 用/アプリ/index.html'],
    ['括弧を含むパス', '/Volumes/CT1000P3/pCloud(CT1000P3)/(github)/index.html'],
  ])('自分のページを許可: %s', (_, htmlPath) => {
    expect(isAppUrl(toUrl(htmlPath), htmlPath)).toBe(true);
  });

  test('エンコードの表記が違っても同じパスなら許可する', () => {
    const url = 'file:///Volumes/pCloud%28CT1000P3%29/%E4%BD%9C%E6%A5%AD/index.html';
    expect(isAppUrl(url, '/Volumes/pCloud(CT1000P3)/作業/index.html')).toBe(true);
  });

  test('Unicode正規化の違いは同じパスとして扱う', () => {
    const composed = '/Volumes/データ/index.html';
    expect(isAppUrl(toUrl(composed.normalize('NFD')), composed)).toBe(true);
  });

  test('クエリとハッシュは無視する', () => {
    expect(isAppUrl(`${toUrl(PACKAGED_HTML)}?a=1#top`, PACKAGED_HTML)).toBe(true);
  });

  test.each([
    ['外部サイト', 'https://example.com/index.html'],
    ['別のローカルファイル', 'file:///tmp/evil.html'],
    ['同名の別フォルダ', 'file:///tmp/index.html'],
    ['dataスキーム', 'data:text/html,<script>alert(1)</script>'],
    ['不正なURL', 'not a url'],
    ['空文字', ''],
  ])('拒否: %s', (_, url) => {
    expect(isAppUrl(url, PACKAGED_HTML)).toBe(false);
  });
});

describe('isTrustedSender', () => {
  const event = url => ({ senderFrame: { url } });

  test('自分のページからの呼び出しを許可する', () => {
    expect(isTrustedSender(event(toUrl(PACKAGED_HTML)), PACKAGED_HTML)).toBe(true);
  });

  test('別のページからの呼び出しを拒否する', () => {
    expect(isTrustedSender(event('https://example.com/'), PACKAGED_HTML)).toBe(false);
  });

  test('senderFrame が無い場合は拒否する', () => {
    expect(isTrustedSender({ senderFrame: null }, PACKAGED_HTML)).toBe(false);
    expect(isTrustedSender({}, PACKAGED_HTML)).toBe(false);
  });
});

describe('applyWindowSecurity', () => {
  let webContents;
  let openHandler;
  let onBlocked;

  const navigate = url => {
    const event = { preventDefault: jest.fn() };
    webContents.emit('will-navigate', event, url);
    return event.preventDefault;
  };

  beforeEach(() => {
    webContents = new EventEmitter();
    webContents.setWindowOpenHandler = handler => {
      openHandler = handler;
    };
    onBlocked = jest.fn();
    applyWindowSecurity(webContents, PACKAGED_HTML, onBlocked);
  });

  test('外部への遷移を止めて通知する', () => {
    expect(navigate('https://example.com/')).toHaveBeenCalledTimes(1);
    expect(onBlocked).toHaveBeenCalledWith('navigation', 'https://example.com/');
  });

  test('ローカルファイルのドロップによる遷移を止める', () => {
    expect(navigate('file:///Users/me/report.html')).toHaveBeenCalledTimes(1);
  });

  test('自分のページへの遷移は止めない', () => {
    expect(navigate(toUrl(PACKAGED_HTML))).not.toHaveBeenCalled();
    expect(onBlocked).not.toHaveBeenCalled();
  });

  test('新しいウィンドウは常に拒否する', () => {
    expect(openHandler({ url: toUrl(PACKAGED_HTML) })).toEqual({ action: 'deny' });
    expect(onBlocked).toHaveBeenCalledWith('window-open', toUrl(PACKAGED_HTML));
  });
});

describe('main.js の配線', () => {
  const main = readSource('main/main.js');

  test('sandbox を有効にする', () => {
    expect(main).toMatch(/sandbox:\s*true/);
  });

  test('ページを読み込む前に遷移制限を適用する', () => {
    const applied = main.indexOf('applyWindowSecurity(');
    expect(applied).toBeGreaterThan(-1);
    expect(applied).toBeLessThan(main.indexOf('this.mainWindow.loadFile('));
  });

  test('IPCハンドラーはすべて送信元の検証を通る', () => {
    expect(main.match(/ipcMain\.handle\(/g)).toHaveLength(1);
    expect(main).toMatch(/handleIpc\(channel, handler\)/);
    expect(main).toContain('isTrustedSender(event');
  });

  test.each(['read-file', 'write-file', 'process-file', 'process-files', 'generate-preview'])(
    '%s を公開しない',
    channel => {
      expect(main).not.toContain(`'${channel}'`);
    }
  );

  test('設定の読み書きのエラー処理から filePath を参照できる', () => {
    expect(main.match(/let filePath = null;/g)).toHaveLength(2);
    expect(main).not.toMatch(/const filePath = await FileOperations\.select/);
  });

  test('設定の読み書きでレンダラーからパスを受け取らない', () => {
    expect(main).toMatch(/handleIpc\('load-config', async \(\) =>/);
    expect(main).toMatch(/handleIpc\('save-config', async \(event, config\) =>/);
  });
});

describe('preload の公開API', () => {
  const preload = readSource('preload/preload.js');

  test.each(['readFile', 'writeFile', 'processFile', 'processFiles', 'generatePreview'])(
    '%s を公開しない',
    api => {
      expect(preload).not.toMatch(new RegExp(`^  ${api}:`, 'm'));
    }
  );

  test('設定の読み書きにパスを渡せない', () => {
    expect(preload).toMatch(/^ {2}loadConfig: async \(\) =>/m);
    expect(preload).toMatch(/^ {2}saveConfig: async config =>/m);
  });

  test('サンドボックスで使えないモジュールを読み込まない', () => {
    const modules = preload.match(/require\('[^']+'\)/g);
    expect(modules).toEqual(["require('electron')"]);
  });
});

describe('レンダラー', () => {
  const html = readSource('renderer/index.html');

  test('スクリプトのCSPから unsafe-inline を外す', () => {
    const scriptSrc = html.match(/script-src[^;]*;/)[0];
    expect(scriptSrc).toBe("script-src 'self';");
  });

  test('CSPで止まるインラインスクリプトとイベント属性が無い', () => {
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)[^>]*>/);
    expect(html).not.toMatch(/\son[a-z]+=/);
  });

  test.each(rendererScripts)('削除したAPIの呼び出しが残っていない: %s', file => {
    const script = readSource(`renderer/js/${file}`);
    expect(script).not.toMatch(/electronAPI\.(readFile|processFiles|generatePreview)\b/);
  });

  test('設定の保存にパスを渡さない', () => {
    for (const file of rendererScripts) {
      expect(readSource(`renderer/js/${file}`)).not.toMatch(/electronAPI\.saveConfig\([^)\s]+,/);
    }
  });

  test('HTMLが読み込むスクリプトと js フォルダの内容が一致する', () => {
    const loaded = [...html.matchAll(/<script src="js\/([^"]+)"/g)].map(match => match[1]);
    expect(loaded.sort()).toEqual([...rendererScripts].sort());
  });

  test('初期実装の app.js を読み込まない（追加ボタンの処理が UIController と重複していた）', () => {
    expect(rendererScripts).not.toContain('app.js');
    expect(html).not.toContain('js/app.js');
  });
});
