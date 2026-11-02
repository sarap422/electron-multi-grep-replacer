/**
 * Task 1102.1: レンダラー側の配線テスト
 * 実際のレンダラークラスを vm 上で読み込み、最小のDOMスタブで検証する。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RENDERER = path.join(__dirname, '../src/renderer');
const readRenderer = file => fs.readFileSync(path.join(RENDERER, file), 'utf8');

let checkboxes;
let ui;
let exec;
let electronAPI;
let created;

beforeEach(() => {
  created = [];
  checkboxes = {
    includeFileName: { checked: false },
    includeExtension: { checked: false },
    interpretEscapes: { checked: false },
  };
  electronAPI = {
    executeReplacement: jest.fn(),
    cancelReplacement: jest.fn().mockResolvedValue({ success: true, cancelled: true }),
    pauseReplacement: jest.fn().mockResolvedValue({ success: true, paused: true }),
    resumeReplacement: jest.fn().mockResolvedValue({ success: true, resumed: true }),
  };
  const window = { electronAPI };
  const document = {
    getElementById: id => checkboxes[id] || null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => {
      const slots = {};
      const element = {
        style: {},
        addEventListener: () => {},
        querySelector: selector => {
          slots[selector] = slots[selector] || { addEventListener: () => {} };
          return slots[selector];
        },
        slots,
      };
      created.push(element);
      return element;
    },
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
  };
  const context = vm.createContext({ window, document, console, setTimeout: jest.fn() });
  vm.runInContext(
    `${readRenderer('js/ui-controller.js')};window.UIController = UIController;`,
    context
  );
  vm.runInContext(readRenderer('js/execution-controller.js'), context);
  ui = Object.create(window.UIController.prototype);
  exec = Object.create(window.ExecutionController.prototype);
  window.uiController = ui;
});

const check = id => {
  checkboxes[id].checked = true;
};

describe('対象オプションのチェックボックス', () => {
  test('既定はすべてオフ', () => {
    expect({ ...ui.getTargetOptions() }).toEqual({
      includeFileName: false,
      includeExtension: false,
      interpretEscapes: false,
    });
  });

  test('モードタブの直後（フォルダ選択より前）に表示される', () => {
    const html = readRenderer('index.html');
    const options = html.indexOf('class="target-options"');
    expect(options).toBeGreaterThan(html.indexOf('class="mode-tabs"'));
    expect(options).toBeLessThan(html.indexOf('id="folder-heading"'));
    Object.keys(checkboxes).forEach(id => expect(html).toContain(`id="${id}"`));
    expect(html).toContain('\\n\\t を有効にする');
  });

  test('実行設定に targetOptions が含まれる', () => {
    check('includeExtension');
    const config = exec.gatherExecutionConfig();
    expect(config.targetOptions.includeExtension).toBe(true);
    expect(config.targetOptions.includeFileName).toBe(false);
  });

  test('設定の読み込みで反映され、未指定はオフに戻る', () => {
    ui.setTargetOptions({ include_file_name: true, interpret_escapes: true });
    expect(ui.getTargetOptions().includeFileName).toBe(true);
    expect(ui.getTargetOptions().interpretEscapes).toBe(true);
    ui.setTargetOptions(undefined);
    expect(ui.getTargetOptions().includeFileName).toBe(false);
  });
});

describe('置換結果の表示', () => {
  const contentDetail = { rule: 'old → new', from: 'old', to: 'new', count: 2 };

  test('リネーム成功: 内容の行に続いてリネーム行を出す', () => {
    exec.results = [
      {
        path: '/d/old.txt',
        renamedTo: '/d/new.txt',
        modified: true,
        changes: 3,
        details: [contentDetail],
      },
    ];
    const rows = exec.buildResultRows();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ from: 'old.txt', to: 'new.txt', count: 1, error: '' });
    expect(exec.buildResultTextLines()[1]).toContain('[リネーム] old.txt → new.txt (1 occurrence)');
  });

  test('リネームのみのファイルに空行を出さない', () => {
    exec.results = [
      { path: '/d/old.txt', renamedTo: '/d/new.txt', modified: true, changes: 1, details: [] },
    ];
    expect(exec.buildResultRows()).toHaveLength(1);
  });

  test('リネーム失敗: 内容の変更がなくても ❌ で表示し、CSVにも理由を出す', () => {
    exec.results = [
      {
        path: '/d/old.txt',
        modified: false,
        changes: 0,
        details: [],
        renameError: '同名のファイルが既に存在します: new.txt',
        attemptedName: 'new.txt',
      },
    ];
    const [line] = exec.buildResultTextLines();
    expect(line.startsWith('❌')).toBe(true);
    expect(line).toContain('old.txt → new.txt');
    expect(exec.generateCSVResults()).toContain('同名のファイルが既に存在します');
  });
});

describe('検索結果の表示', () => {
  test('ファイル名の一致は行番号なしで表示する', () => {
    expect(ui.buildGrepPrefix({ target: 'filename', path: '/d/a.txt', line: 0, col: 1 })).toBe(
      '/d/a.txt:[ファイル名]: '
    );
    expect(ui.buildGrepPrefix({ path: '/d/a.txt', line: 2, col: 3 })).toBe('/d/a.txt:2:3: ');
  });
});

describe('CSVの数式インジェクション対策', () => {
  test.each(['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx'])('数式の開始文字を無効化: %j', value => {
    expect(exec.constructor.escapeCsvCell(value)).toBe(`"'${value}"`);
  });

  test('通常の値と数値はそのまま、ダブルクォートは二重化する', () => {
    expect(exec.constructor.escapeCsvCell('a"b')).toBe('"a""b"');
    expect(exec.constructor.escapeCsvCell(3)).toBe('"3"');
    expect(exec.constructor.escapeCsvCell('/d/a.txt')).toBe('"/d/a.txt"');
  });

  test('置換結果と検索結果の両方のCSVに適用される', () => {
    exec.results = [
      {
        path: '/d/a.txt',
        renamedTo: '/d/=cmd.txt',
        modified: true,
        changes: 1,
        details: [],
      },
    ];
    expect(exec.generateCSVResults()).toContain('"\'=cmd.txt"');
    ui.lastGrepResults = [{ path: '/d/a.txt', line: 1, col: 1, text: '=cmd' }];
    expect(ui.buildGrepCsv()).toContain('"\'=cmd"');
  });
});

describe('実行の制御', () => {
  const successResult = cancelled => ({
    success: true,
    cancelled,
    stats: { totalFiles: 25, processedFiles: 10, changedFiles: 10, totalChanges: 10 },
    results: [{ path: '/d/a.txt', changes: 1 }],
  });

  beforeEach(() => {
    exec.elements = {
      pauseButton: { innerHTML: '', disabled: false },
      stopButton: { disabled: false },
      currentFile: { textContent: '' },
    };
    exec.completeExecution = jest.fn();
    exec.finishStoppedExecution = jest.fn();
    exec.handleExecutionError = jest.fn();
  });

  test('モック実行が残っていない', () => {
    const source = readRenderer('js/execution-controller.js');
    expect(source).not.toMatch(/mock|simulateProcessing/i);
  });

  test('実行に失敗したらエラーを表示し、結果を偽装しない', async () => {
    electronAPI.executeReplacement.mockResolvedValue({ success: false, error: '失敗' });
    await exec.executeReplacement({ rules: [] });
    expect(exec.handleExecutionError).toHaveBeenCalledTimes(1);
    expect(exec.handleExecutionError.mock.calls[0][0].message).toBe('失敗');
    expect(exec.completeExecution).not.toHaveBeenCalled();
  });

  test('正常完了は completeExecution へ進む', async () => {
    electronAPI.executeReplacement.mockResolvedValue(successResult(false));
    await exec.executeReplacement({ rules: [] });
    expect(exec.completeExecution).toHaveBeenCalledTimes(1);
  });

  test('停止された結果は部分結果として扱い、件数を反映する', async () => {
    electronAPI.executeReplacement.mockResolvedValue(successResult(true));
    await exec.executeReplacement({ rules: [] });
    expect(exec.finishStoppedExecution).toHaveBeenCalledTimes(1);
    expect(exec.completeExecution).not.toHaveBeenCalled();
    expect(exec.stats.processedFiles).toBe(10);
  });

  test('Stop確定でメインプロセスの処理を中断する', async () => {
    exec.state = 'executing';
    await exec.stopExecution();
    expect(electronAPI.cancelReplacement).toHaveBeenCalledTimes(1);
    expect(exec.state).toBe('stopping');
    expect(exec.elements.pauseButton.disabled).toBe(true);
    expect(exec.elements.stopButton.disabled).toBe(true);
  });

  test('一時停止中でも停止できる', async () => {
    exec.state = 'pausing';
    await exec.stopExecution();
    expect(electronAPI.cancelReplacement).toHaveBeenCalledTimes(1);
  });

  test('実行が終わった後の停止は何もしない', async () => {
    exec.state = 'completed';
    await exec.stopExecution();
    expect(electronAPI.cancelReplacement).not.toHaveBeenCalled();
  });

  test('Pauseで一時停止、もう一度押すと再開する', async () => {
    const event = { preventDefault: () => {} };
    exec.stats = {};
    exec.state = 'executing';
    await exec.handlePauseClick(event);
    expect(electronAPI.pauseReplacement).toHaveBeenCalledTimes(1);
    expect(exec.state).toBe('pausing');
    expect(exec.elements.pauseButton.innerHTML).toContain('Resume');
    await exec.handlePauseClick(event);
    expect(electronAPI.resumeReplacement).toHaveBeenCalledTimes(1);
    expect(exec.state).toBe('executing');
    expect(exec.elements.pauseButton.innerHTML).toContain('Pause');
  });

  test('Pause/Stopの処理は UIController に重複していない', () => {
    const source = readRenderer('js/ui-controller.js');
    expect(source).not.toMatch(/handlePauseReplacement|handleStopReplacement/);
  });
});

describe('通知のXSS対策', () => {
  const payload = '/d/<img src=x onerror=alert(1)>.txt';

  test.each([
    ['showError', () => ui.showError(payload, payload), '.error-message'],
    ['showSuccess', () => ui.showSuccess(payload, payload), '.success-message'],
    ['showToast', () => exec.showToast(payload, 'error'), '.toast-message'],
  ])('%s はメッセージをHTMLとして解釈しない', (_, show, selector) => {
    show();
    const element = created.find(el => el.innerHTML !== undefined);
    expect(element.innerHTML).not.toContain('<img');
    expect(element.slots[selector].textContent).toBe(payload);
  });
});
