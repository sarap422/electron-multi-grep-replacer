/**
 * Task 1102.1: 「ファイル名・拡張子を対象に含める」「\n\t を有効にする」の単体テスト
 * 検証対象: target-options（純粋関数）/ ReplacementEngine のリネーム / GrepEngine のファイル名検索
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('../src/main/debug-logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  startPerformance: jest.fn(),
  endPerformance: jest.fn(),
}));

const {
  decodeEscapes,
  decodeRule,
  splitNameTarget,
  validateNewName,
} = require('../src/main/target-options');
const ReplacementEngine = require('../src/main/replacement-engine');
const GrepEngine = require('../src/main/grep-engine');

let dir;
const write = (name, content = '') => fs.writeFileSync(path.join(dir, name), content);
const read = name => fs.readFileSync(path.join(dir, name), 'utf8');
const exists = name => fs.existsSync(path.join(dir, name));
const paths = (...names) => names.map(n => path.join(dir, n));
const rule = (from, to) => ({ from, to, enabled: true });

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mgr-target-options-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('decodeEscapes', () => {
  test('\\n \\t \\r を制御文字に変換する', () => {
    expect(decodeEscapes('a\\nb\\tc\\r')).toBe('a\nb\tc\r');
  });

  test('\\\\ は1つのバックスラッシュになり、後続の n を改行にしない', () => {
    expect(decodeEscapes('a\\\\nb')).toBe('a\\nb');
  });

  test('未知のエスケープと末尾の \\ はそのまま残す', () => {
    expect(decodeEscapes('\\d+\\')).toBe('\\d+\\');
  });

  test('空文字と空白は変更しない', () => {
    expect(decodeEscapes('')).toBe('');
    expect(decodeEscapes('  a ')).toBe('  a ');
  });
});

describe('decodeRule', () => {
  test('有効時は from/to を変換し、表示用に入力値を保持する', () => {
    const decoded = decodeRule(rule('a\\n', '\\t'), true);
    expect(decoded).toMatchObject({ from: 'a\n', to: '\t', rawFrom: 'a\\n', rawTo: '\\t' });
  });

  test('無効時はリテラルのまま', () => {
    const decoded = decodeRule(rule('a\\n', '\\t'), false);
    expect(decoded).toMatchObject({ from: 'a\\n', to: '\\t', rawFrom: 'a\\n', rawTo: '\\t' });
  });
});

describe('splitNameTarget', () => {
  test('ファイル名のみ: 拡張子を除いた部分が対象', () => {
    expect(splitNameTarget('foo.html', { includeFileName: true })).toEqual({
      prefix: '',
      target: 'foo',
      suffix: '.html',
    });
  });

  test('拡張子のみ: ドット付き拡張子が対象', () => {
    expect(splitNameTarget('foo.html', { includeExtension: true })).toEqual({
      prefix: 'foo',
      target: '.html',
      suffix: '',
    });
  });

  test('両方: 全体が対象', () => {
    expect(splitNameTarget('foo.html', { includeFileName: true, includeExtension: true })).toEqual({
      prefix: '',
      target: 'foo.html',
      suffix: '',
    });
  });

  test('両方オフ: null', () => {
    expect(splitNameTarget('foo.html', {})).toBeNull();
  });

  test('複合拡張子は最後の拡張子だけを拡張子として扱う', () => {
    expect(splitNameTarget('a.tar.gz', { includeExtension: true })).toEqual({
      prefix: 'a.tar',
      target: '.gz',
      suffix: '',
    });
  });

  test('ドットファイルは全体がファイル名扱いで拡張子なし', () => {
    expect(splitNameTarget('.gitignore', { includeExtension: true }).target).toBe('');
    expect(splitNameTarget('.gitignore', { includeFileName: true }).target).toBe('.gitignore');
  });
});

describe('validateNewName', () => {
  test('通常の名前は許可（戻り値 null）', () => {
    expect(validateNewName('a.txt', 'b c.txt')).toBeNull();
    expect(validateNewName('a.txt', 'a')).toBeNull();
    expect(validateNewName('.env', '.env2')).toBeNull();
  });

  test.each([
    ['空', ''],
    ['カレント', '.'],
    ['親', '..'],
    ['スラッシュ', '../evil.txt'],
    ['バックスラッシュ', 'a\\b.txt'],
    ['改行', 'a\nb.txt'],
    ['タブ', 'a\tb.txt'],
    ['NUL', 'a\0b.txt'],
  ])('不正な名前を拒否: %s', (_, newName) => {
    expect(validateNewName('a.txt', newName)).toEqual(expect.any(String));
  });

  test('ファイル名が消えて隠しファイル化する変更を拒否', () => {
    expect(validateNewName('foo.html', '.html')).toEqual(expect.any(String));
  });
});

describe('ReplacementEngine: リネーム', () => {
  test('オプションなしでは内容だけ置換し、リネームしない（後方互換）', async () => {
    write('old.txt', 'old');
    const result = await new ReplacementEngine().processFiles(paths('old.txt'), [
      rule('old', 'new'),
    ]);
    expect(read('old.txt')).toBe('new');
    expect(exists('new.txt')).toBe(false);
    expect(result.results[0].renamedTo).toBeUndefined();
  });

  test('ファイル名のみ: 拡張子は変えず、内容も置換する', async () => {
    write('old.old', 'old');
    const engine = new ReplacementEngine();
    const result = await engine.processFiles(paths('old.old'), [rule('old', 'new')], {
      includeFileName: true,
    });
    expect(read('new.old')).toBe('new');
    expect(exists('old.old')).toBe(false);
    const [file] = result.results;
    expect(file.path).toBe(path.join(dir, 'old.old'));
    expect(file.renamedTo).toBe(path.join(dir, 'new.old'));
    expect(file.changes).toBe(2);
    expect(result.stats.renamedFiles).toBe(1);
    expect(result.stats.totalReplacements).toBe(2);
  });

  test('内容の一致がなくファイル名だけ一致しても modified に数える', async () => {
    write('old.txt', 'none');
    const result = await new ReplacementEngine().processFiles(
      paths('old.txt'),
      [rule('old', 'new')],
      { includeFileName: true }
    );
    expect(result.results[0].modified).toBe(true);
    expect(result.stats.modifiedFiles).toBe(1);
  });

  test('拡張子のみ: ファイル名は変えない', async () => {
    write('html.html', '');
    await new ReplacementEngine().processFiles(paths('html.html'), [rule('.html', '.php')], {
      includeExtension: true,
    });
    expect(exists('html.php')).toBe(true);
  });

  test('両方: ドットをまたいで一致する', async () => {
    write('foo.html', '');
    await new ReplacementEngine().processFiles(paths('foo.html'), [rule('foo.html', 'bar.php')], {
      includeFileName: true,
      includeExtension: true,
    });
    expect(exists('bar.php')).toBe(true);
  });

  test('複数ルールを順に適用する', async () => {
    write('a.txt', '');
    await new ReplacementEngine().processFiles(paths('a.txt'), [rule('a', 'b'), rule('b', 'c')], {
      includeFileName: true,
    });
    expect(exists('c.txt')).toBe(true);
  });

  test('既存ファイルを上書きせず、失敗として報告する', async () => {
    write('old.txt', 'old');
    write('new.txt', 'KEEP');
    const result = await new ReplacementEngine().processFiles(
      paths('old.txt'),
      [rule('old', 'new')],
      { includeFileName: true }
    );
    expect(read('new.txt')).toBe('KEEP');
    expect(read('old.txt')).toBe('new');
    const [file] = result.results;
    expect(file.renameError).toEqual(expect.any(String));
    expect(file.renamedTo).toBeUndefined();
    expect(result.stats.renamedFiles).toBe(0);
    expect(result.stats.errors).toHaveLength(1);
  });

  test('同名に収束する2ファイルは片方だけ変更し、データを失わない', async () => {
    write('a.txt', 'A');
    write('b.txt', 'B');
    const result = await new ReplacementEngine().processFiles(
      paths('a.txt', 'b.txt'),
      [rule('a', 'c'), rule('b', 'c')],
      { includeFileName: true }
    );
    const contents = [exists('a.txt'), exists('b.txt'), exists('c.txt')];
    expect(contents.filter(Boolean)).toHaveLength(2);
    expect(result.stats.renamedFiles).toBe(1);
    expect(result.stats.errors).toHaveLength(1);
    const all = fs.readdirSync(dir).map(read).sort();
    expect(all).toEqual(['A', 'B']);
  });

  test('パス区切りでフォルダ外へ移動させない', async () => {
    fs.mkdirSync(path.join(dir, 'sub'));
    const target = path.join(dir, 'sub', 'old.txt');
    fs.writeFileSync(target, '');
    const result = await new ReplacementEngine().processFiles([target], [rule('old', '../old')], {
      includeFileName: true,
    });
    expect(fs.existsSync(target)).toBe(true);
    expect(exists('old.txt')).toBe(false);
    expect(result.results[0].renameError).toEqual(expect.any(String));
  });

  test('大文字小文字だけの変更は同一ファイルとして許可する', async () => {
    write('foo.txt', 'x');
    const result = await new ReplacementEngine().processFiles(
      paths('foo.txt'),
      [rule('foo', 'Foo')],
      { includeFileName: true }
    );
    expect(result.results[0].renameError).toBeUndefined();
    expect(fs.readdirSync(dir)).toEqual(['Foo.txt']);
  });

  test('内容の読み書きに失敗したファイルはリネームしない', async () => {
    const missing = path.join(dir, 'old.txt');
    const result = await new ReplacementEngine().processFiles([missing], [rule('old', 'new')], {
      includeFileName: true,
    });
    expect(result.stats.renamedFiles).toBe(0);
    expect(result.results[0].error).toEqual(expect.any(String));
  });

  test('同じパスが重複して渡されても1回だけリネームする', async () => {
    write('old.txt', '');
    const [file] = paths('old.txt');
    const result = await new ReplacementEngine().processFiles([file, file], [rule('old', 'new')], {
      includeFileName: true,
    });
    expect(exists('new.txt')).toBe(true);
    expect(result.stats.renamedFiles).toBe(1);
    expect(result.stats.errors).toHaveLength(0);
  });

  test('dryRun ではリネームしない', async () => {
    write('old.txt', '');
    const engine = new ReplacementEngine({ dryRun: true });
    await engine.processFiles(paths('old.txt'), [rule('old', 'new')], { includeFileName: true });
    expect(exists('old.txt')).toBe(true);
  });

  test('前回実行のオプションが次回に持ち越されない', async () => {
    write('old.txt', '');
    const engine = new ReplacementEngine();
    await engine.processFiles(paths('old.txt'), [rule('zzz', 'y')], { includeFileName: true });
    await engine.processFiles(paths('old.txt'), [rule('old', 'new')]);
    expect(exists('old.txt')).toBe(true);
  });
});

describe('ReplacementEngine: エスケープ', () => {
  test('有効時: \\n を含むFromで複数行に一致し、\\t に置換する', async () => {
    write('a.txt', 'x\ny');
    await new ReplacementEngine().processFiles(paths('a.txt'), [rule('x\\ny', 'x\\ty')], {
      interpretEscapes: true,
    });
    expect(read('a.txt')).toBe('x\ty');
  });

  test('無効時: \\n はリテラルのバックスラッシュ+n', async () => {
    write('a.txt', 'x\\ny\nx\ny');
    await new ReplacementEngine().processFiles(paths('a.txt'), [rule('x\\ny', 'z')]);
    expect(read('a.txt')).toBe('z\nx\ny');
  });

  test('結果の details は入力どおりの表記を保つ（改行で行が崩れない）', async () => {
    write('a.txt', 'x\ny');
    const result = await new ReplacementEngine().processFiles(
      paths('a.txt'),
      [rule('x\\ny', 'z')],
      {
        interpretEscapes: true,
      }
    );
    expect(result.results[0].details[0]).toMatchObject({ from: 'x\\ny', rule: 'x\\ny → z' });
  });

  test('ファイル名に改行を入れる変更は拒否する', async () => {
    write('old.txt', '');
    const result = await new ReplacementEngine().processFiles(
      paths('old.txt'),
      [rule('old', 'a\\nb')],
      { includeFileName: true, interpretEscapes: true }
    );
    expect(exists('old.txt')).toBe(true);
    expect(result.results[0].renameError).toEqual(expect.any(String));
  });
});

describe('GrepEngine: ファイル名検索', () => {
  test('オプションなしでは内容のみ検索（後方互換）', async () => {
    write('needle.txt', 'none');
    const { results } = await new GrepEngine().search(paths('needle.txt'), 'needle');
    expect(results).toHaveLength(0);
  });

  test('ファイル名の一致を target: filename で返し、ハイライト位置が正確', async () => {
    write('a-needle.txt', 'none');
    const { results, stats } = await new GrepEngine().search(paths('a-needle.txt'), 'needle', {
      includeFileName: true,
    });
    expect(results).toHaveLength(1);
    const [r] = results;
    expect(r).toMatchObject({ target: 'filename', line: 0, text: 'a-needle.txt' });
    expect(r.text.slice(r.hlStart, r.hlStart + r.hlLen)).toBe('needle');
    expect(stats).toMatchObject({ totalMatches: 1, matchedFiles: 1 });
  });

  test('拡張子のみ: ハイライトは拡張子の位置', async () => {
    write('html.html', 'none');
    const { results } = await new GrepEngine().search(paths('html.html'), 'html', {
      includeExtension: true,
    });
    expect(results).toHaveLength(1);
    expect(results[0].hlStart).toBe('html.'.length);
  });

  test('名前と内容の両方に一致してもファイル数は1', async () => {
    write('needle.txt', 'needle');
    const { results, stats } = await new GrepEngine().search(paths('needle.txt'), 'needle', {
      includeFileName: true,
    });
    expect(results.map(r => r.line)).toEqual([0, 1]);
    expect(stats).toMatchObject({ totalMatches: 2, matchedFiles: 1 });
  });

  test('バイナリファイルも名前は検索できる', async () => {
    fs.writeFileSync(path.join(dir, 'needle.bin'), Buffer.from([0, 1, 2]));
    const { results, stats } = await new GrepEngine().search(paths('needle.bin'), 'needle', {
      includeFileName: true,
    });
    expect(results).toHaveLength(1);
    expect(stats.skipped).toBe(1);
  });

  test('件数上限を超えない', async () => {
    write('needle.txt', 'needle needle');
    const { results, stats } = await new GrepEngine({ maxResults: 2 }).search(
      paths('needle.txt'),
      'needle',
      { includeFileName: true }
    );
    expect(results).toHaveLength(2);
    expect(stats.truncated).toBe(true);
  });

  test('\\n 有効時は行をまたいで内容検索できる', async () => {
    write('a.txt', 'foo\nbar');
    const { results } = await new GrepEngine().search(paths('a.txt'), 'foo\\nbar', {
      interpretEscapes: true,
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ line: 1, col: 1 });
  });
});

describe('ReplacementEngine: 停止・一時停止', () => {
  const makeFiles = count => {
    const names = Array.from({ length: count }, (_, i) => `f${i}.txt`);
    names.forEach(name => write(name, 'old'));
    return paths(...names);
  };
  const countReplaced = () => fs.readdirSync(dir).filter(name => read(name) === 'new').length;
  const newEngine = () => new ReplacementEngine({ progressUpdateInterval: 0 });
  const flush = () => new Promise(resolve => setTimeout(resolve, 50));

  test('待機中に停止しても実行していないので false', () => {
    expect(new ReplacementEngine().cancelProcessing()).toBe(false);
  });

  test('バッチの区切りで停止し、部分結果を返す', async () => {
    const engine = newEngine();
    engine.once('progress', () => engine.cancelProcessing());
    const result = await engine.processFiles(makeFiles(25), [rule('old', 'new')]);
    expect(result.cancelled).toBe(true);
    expect(result.stats.processedFiles).toBe(10);
    expect(countReplaced()).toBe(10);
  });

  test('停止するとリネームを実行しない', async () => {
    write('old.txt', 'old');
    const engine = newEngine();
    engine.once('progress', () => engine.cancelProcessing());
    const result = await engine.processFiles(paths('old.txt'), [rule('old', 'new')], {
      includeFileName: true,
    });
    expect(result.cancelled).toBe(true);
    expect(read('old.txt')).toBe('new');
    expect(result.stats.renamedFiles).toBe(0);
  });

  test('ファイル検索中の停止も反映され、1件も変更しない', async () => {
    const engine = newEngine();
    engine.prepareRun();
    expect(engine.cancelProcessing()).toBe(true);
    const result = await engine.processFiles(makeFiles(3), [rule('old', 'new')]);
    expect(result.cancelled).toBe(true);
    expect(countReplaced()).toBe(0);
  });

  test('停止後の次回実行は通常どおり動く', async () => {
    const engine = newEngine();
    const files = makeFiles(3);
    engine.prepareRun();
    engine.cancelProcessing();
    await engine.processFiles(files, [rule('old', 'new')]);
    const result = await engine.processFiles(files, [rule('old', 'new')]);
    expect(result.cancelled).toBe(false);
    expect(countReplaced()).toBe(3);
  });

  test('一時停止中は次のバッチへ進まず、再開すると完了する', async () => {
    const engine = newEngine();
    engine.once('progress', () => engine.pauseProcessing());
    const run = engine.processFiles(makeFiles(25), [rule('old', 'new')]);
    await flush();
    expect(engine.getStats().processedFiles).toBe(10);
    expect(engine.resumeProcessing()).toBe(true);
    const result = await run;
    expect(result.cancelled).toBe(false);
    expect(countReplaced()).toBe(25);
  });

  test('一時停止はリネームの前でも止まる', async () => {
    write('old.txt', '');
    const engine = newEngine();
    engine.once('progress', () => engine.pauseProcessing());
    const run = engine.processFiles(paths('old.txt'), [rule('old', 'new')], {
      includeFileName: true,
    });
    await flush();
    expect(exists('old.txt')).toBe(true);
    engine.resumeProcessing();
    await run;
    expect(exists('new.txt')).toBe(true);
  });

  test('一時停止中に停止すると待機を解除して終了する', async () => {
    const engine = newEngine();
    engine.once('progress', () => engine.pauseProcessing());
    const run = engine.processFiles(makeFiles(25), [rule('old', 'new')]);
    await flush();
    engine.cancelProcessing();
    const result = await run;
    expect(result.cancelled).toBe(true);
    expect(countReplaced()).toBe(10);
  });

  test('待機中の一時停止は無効', () => {
    expect(new ReplacementEngine().pauseProcessing()).toBe(false);
  });
});
