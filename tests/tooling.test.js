/**
 * Task 1102.3: 開発ツールの設定テスト
 * 設定ファイルが共有され、フックが品質チェックを実行することを検証する。
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

const isIgnored = file => {
  try {
    execFileSync('git', ['check-ignore', '-q', file], { cwd: ROOT });
    return true;
  } catch (error) {
    return false;
  }
};

describe('設定ファイル', () => {
  test.each([
    '.eslintrc.js',
    '.prettierrc',
    '.prettierignore',
    '.husky/pre-commit',
    '.husky/pre-push',
  ])('%s が存在し、git で共有される', file => {
    expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
    expect(isIgnored(file)).toBe(false);
  });

  test('husky の生成物は共有しない', () => {
    expect(isIgnored('.husky/_/husky.sh')).toBe(true);
  });

  test('CSS は Prettier の対象外（#FFFFFF の表記を保つ）', () => {
    expect(read('.prettierignore')).toContain('src/renderer/css/');
  });
});

describe('Git フック', () => {
  test.each([
    ['.husky/pre-commit', 'npx lint-staged'],
    ['.husky/pre-push', 'npm run test:all'],
  ])('%s は %s を実行する', (hook, command) => {
    const stat = fs.statSync(path.join(ROOT, hook));
    expect(stat.mode & 0o111).not.toBe(0);
    expect(read(hook)).toContain(command);
  });
});

describe('package.json', () => {
  test('clone 後にフックが有効になる', () => {
    expect(pkg.scripts.prepare).toBe('husky install');
  });

  test('husky v8 で無効な旧形式の設定を残さない', () => {
    expect(pkg.husky).toBeUndefined();
  });

  test('存在しないファイルに依存するスクリプトを残さない', () => {
    expect(pkg.scripts['test:e2e']).toBeUndefined();
    expect(pkg.scripts['test:performance']).toBeUndefined();
  });

  test('lint と書式チェックは tests/ も対象にする', () => {
    expect(pkg.scripts.lint).toContain('tests/');
    expect(pkg.scripts['lint:check']).toContain('tests/');
    expect(pkg.scripts['format:check']).toContain('tests/');
    expect(pkg['lint-staged']['tests/**/*.js']).toEqual(['eslint --fix', 'prettier --write']);
  });

  test('dmg の背景色は小文字の hex（大文字は dmgbuild がエラーにする）', () => {
    expect(pkg.build.dmg.backgroundColor).toBe('#ffffff');
  });
});
