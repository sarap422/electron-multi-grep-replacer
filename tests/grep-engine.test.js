/**
 * GrepEngine 単体テスト（node 直接実行: `node tests/grep-engine.test.js`）
 * jest 未設定のため assert ベースの軽量ランナー。
 * 検証対象: extractContext（マッチ周辺のウィンドウ抽出）と findMatches。
 */
const assert = require('assert');
const GrepEngine = require('../src/main/grep-engine');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(`❌ ${name}\n   ${e.message}`);
    process.exitCode = 1;
  }
}

// ---- extractContext ----

test('短い行: 先頭インデントをtrimし全体表示・…無し・ハイライト位置正確', () => {
  const line = '  const x = foo;';
  const r = GrepEngine.extractContext(line, 12, 3, { max: 120, before: 30 });
  assert.strictEqual(r.text, 'const x = foo;');
  assert.strictEqual(r.text.slice(r.hlStart, r.hlStart + r.hlLen), 'foo');
});

test('長い行・末尾付近マッチ: 前後に…付きウィンドウ', () => {
  const head = 'a'.repeat(300);
  const line = head + 'zaratan' + 'b'.repeat(200);
  const r = GrepEngine.extractContext(line, 300, 7, { max: 120, before: 30 });
  assert.ok(r.text.startsWith('…'), 'head ellipsis');
  assert.ok(r.text.endsWith('…'), 'tail ellipsis');
  assert.ok(r.text.length <= 120 + 2, `length capped (${r.text.length})`);
  assert.strictEqual(r.text.slice(r.hlStart, r.hlStart + r.hlLen), 'zaratan');
});

test('長い行・先頭マッチ: 頭の…無し・末尾…あり', () => {
  const line = 'zaratan' + 'b'.repeat(300);
  const r = GrepEngine.extractContext(line, 0, 7, { max: 120, before: 30 });
  assert.ok(!r.text.startsWith('…'), 'no head ellipsis');
  assert.ok(r.text.endsWith('…'), 'tail ellipsis');
  assert.strictEqual(r.text.slice(r.hlStart, r.hlStart + r.hlLen), 'zaratan');
});

test('長い行・末端マッチ: 頭の…あり・末尾…無し', () => {
  const line = 'a'.repeat(300) + 'zaratan';
  const r = GrepEngine.extractContext(line, 300, 7, { max: 120, before: 30 });
  assert.ok(r.text.startsWith('…'), 'head ellipsis');
  assert.ok(!r.text.endsWith('…'), 'no tail ellipsis');
  assert.strictEqual(r.text.slice(r.hlStart, r.hlStart + r.hlLen), 'zaratan');
});

test('日本語（マルチバイト）でもハイライト位置が正確', () => {
  const line = 'これはテスト：zaratan を含む行です';
  const idx = line.indexOf('zaratan');
  const r = GrepEngine.extractContext(line, idx, 7, { max: 120, before: 30 });
  assert.strictEqual(r.text.slice(r.hlStart, r.hlStart + r.hlLen), 'zaratan');
});

// ---- findMatches ----

test('findMatches: 複数行で line(1始まり)/col(1始まり) と件数', () => {
  const content = 'line one\nfoo here\n  foo again\nno match';
  const matches = GrepEngine.findMatches(content, 'foo', { caseSensitive: true });
  assert.strictEqual(matches.length, 2);
  assert.strictEqual(matches[0].line, 2);
  assert.strictEqual(matches[0].col, 1);
  assert.strictEqual(matches[1].line, 3);
  assert.strictEqual(matches[1].col, 3);
});

test('findMatches: 大文字小文字を区別しない', () => {
  const content = 'FOO and foo and Foo';
  const ci = GrepEngine.findMatches(content, 'foo', { caseSensitive: false });
  assert.strictEqual(ci.length, 3);
  const cs = GrepEngine.findMatches(content, 'foo', { caseSensitive: true });
  assert.strictEqual(cs.length, 1);
});

test('findMatches: リテラル一致（正規表現メタ文字をエスケープ）', () => {
  const content = 'a.b a.b axb';
  const m = GrepEngine.findMatches(content, 'a.b', { caseSensitive: true });
  assert.strictEqual(m.length, 2);
});

test('findMatches: min化1行に複数マッチ → 各々ウィンドウ化された別マッチ', () => {
  const content =
    ':root{' + 'x'.repeat(200) + 'zaratan' + 'y'.repeat(200) + 'zaratan' + 'z'.repeat(50) + '}';
  const m = GrepEngine.findMatches(content, 'zaratan', { caseSensitive: true });
  assert.strictEqual(m.length, 2);
  assert.strictEqual(m[0].line, 1);
  assert.ok(m[0].text.length <= 122, 'windowed, not whole line');
  assert.strictEqual(m[0].text.slice(m[0].hlStart, m[0].hlStart + m[0].hlLen), 'zaratan');
});


// ---- search（ファイル統合: 一時ディレクトリ） ----
(async () => {
  const os = require('os');
  const path = require('path');
  const fss = require('fs');
  const dir = fss.mkdtempSync(path.join(os.tmpdir(), 'grep-test-'));
  fss.writeFileSync(path.join(dir, 'a.txt'), 'hello foo\nbar foo baz\nqux');
  fss.writeFileSync(path.join(dir, 'b.txt'), 'no match here');
  fss.writeFileSync(path.join(dir, 'bin.dat'), Buffer.from([0x66, 0x00, 0x6f, 0x6f])); // foo + NUL
  const eng = new GrepEngine();
  const files = ['a.txt', 'b.txt', 'bin.dat'].map(f => path.join(dir, f));
  try {
    const { results, stats } = await eng.search(files, ['foo', 'bar'], { caseSensitive: true });
    assert.strictEqual(stats.skipped, 1, 'バイナリ(bin.dat)をスキップ');
    assert.strictEqual(stats.matchedFiles, 1, 'a.txtのみマッチ');
    assert.strictEqual(results.length, 3, 'foo×2 + bar×1');
    assert.strictEqual(results[0].line, 1); // foo (line1)
    assert.strictEqual(results[1].line, 2); // bar/foo (line2, col順)
    assert.ok(results.every(r => r.path === path.join(dir, 'a.txt')));
    passed++;
    console.log('✅ search: 一時ファイル統合（バイナリスキップ・複数パターンOR・行列整列）');
  } catch (e) {
    console.error(`❌ search 統合\n   ${e.message}`);
    process.exitCode = 1;
  } finally {
    fss.rmSync(dir, { recursive: true, force: true });
  }
  console.log(`\n${passed} passed`);
})();
