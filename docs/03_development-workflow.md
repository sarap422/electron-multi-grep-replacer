# 03_development-workflow.md（開発/テスト方針）

過去にPython版で、最後のパッケージングまで動作確認をせず、作り直しになりました。その反省から、小さく確認しながら進め、問題と知見をその都度記録します。

## 1. 基本の流れ

```
テストを書く → 実装 → テスト → 実機確認（.app / dmg） → 記録 → 次のTask
```

Taskの完了条件は次の5つです。

1. 失敗するテストを書いてから実装した
2. `npm test` と `npm run test:syntax` が通る
3. パッケージ版で動作を確認した
4. `logs/` を更新した
5. テストが失敗している状態でコミットしていない

Task番号は `Task MMDD.N`（例: `Task 1102.1`）で、Explore → Plan → Code & Test → Record & Commit の順に進めます。

## 2. コマンド

```bash
npm start            # アプリ起動
npm run dev          # ログ有効で起動
npm test             # Jest
npm run test:syntax  # main / preload の構文チェック
npm run build:mac    # dist/MultiGrepReplacer-<version>.dmg を生成
npm run build:win    # NSISインストーラーを生成（macOSではWineが必要）
```

現在、次のコマンドは使えません。

| コマンド | 理由 |
|---|---|
| `npm run lint` / `npm run quality` / `npm run test:all` | `.eslintrc.js`、`.prettierrc` がリポジトリにない |
| `npm run test:e2e` | `jest.e2e.config.js` がない |
| `npm run test:performance` | `tests/performance-test.js` がない |

`.husky` もないため、pre-commit と pre-push のフックは動いていません。作業完了の確認は `npm test` と `npm run test:syntax` で行います。

## 3. テスト方針

| 対象 | 方法 | ファイル |
|---|---|---|
| 純粋関数 | Jestの単体テスト | `tests/target-options.test.js`、`tests/grep-engine.test.js` |
| エンジン | 一時フォルダに実ファイルを作って検証 | `tests/target-options.test.js` |
| レンダラー | `vm` で実際のクラスを読み込み、最小のDOMスタブで検証 | `tests/target-options-renderer.test.js` |
| 画面・操作 | パッケージ版を手動で確認 | なし |

- テストは Jest の `test()` で書く。`node` で直接実行する形式にしない
- ファイルを書き換える処理は、モックではなく実ファイルで検証する
- ファイルを壊す可能性のある処理は、異常系を先に書く（衝突、不正な名前、同名への収束）
- jsdom は使わない。package.json に宣言のない間接依存で、Jest上で読み込めない
- テストを無効化して通さない

## 4. 動作確認の手順

パッケージ版でしか起きない問題があるため、機能追加のたびに dmg で確認します。

1. `npm start` で開発版を確認する
2. dmg を作ってインストールし、パッケージ版を確認する
3. 2回起動して、シングルインスタンス制御を確認する
4. 実データで試す前に、テスト用フォルダで結果を確認する

置換は元に戻せません。自分のリポジトリに一括置換をかけるときは、先にコミットするか別ブランチで行い、`package.json` と `*.lock` を対象から外します。

## 5. ビルドの注意

dmg の生成には PATH 上の `python` が必要です。`python3` が alias の環境では子プロセスから見えないため、実体へのリンクをビルド時だけ PATH に追加します。プロジェクトのフォルダで実行してください。

```bash
mkdir -p /tmp/mgr-bin
ln -sf /usr/local/bin/python3.13 /tmp/mgr-bin/python
PATH="/tmp/mgr-bin:$PATH" PYTHON_PATH=/tmp/mgr-bin/python npm run build:mac
```

- `electron-builder` の成否は `| tail` の終了コードで判断せず、`dist/` の成果物で確認する
- `asar extract-file` はカレントディレクトリへ書き出すので、リポジトリ直下で実行しない

## 6. ログと記録

デバッグではまず `logs/` を確認します。

| ファイル | 書く内容 | タイミング |
|---|---|---|
| `logs/CHANGELOG.md` | 実装内容・技術的な決定 | Task完了時 |
| `logs/ERRORLOG.md` | 症状・原因・解決・予防策の4点 | 問題が起きたらすぐ |
| `logs/PATTERNS.md` | 再利用できるパターン・知見 | 得られたとき |
| `logs/devlog/` | 判断理由と試行錯誤の振り返り | セッションの区切り |

ランタイムログは `vibelogger` で構造化して出力します。AIが読んで状況を把握できるよう、`context` に状態、`humanNote` に意図、`aiTodo` に次の確認事項を書きます。

```javascript
window.vibeLogger.info('rule_add_start', 'ルール追加開始', {
  context: { component: 'RuleManager' },
  humanNote: 'ルール追加の開始',
  aiTodo: '応答が100msを超えたら原因を確認',
});
```

ユーザーから指摘を受けたら、同じミスを防ぐルールを `logs/PATTERNS.md` に、原因と解決策を `logs/ERRORLOG.md` に追記します。

## 7. Git

- コメント、ログ、ドキュメント、コミットメッセージは日本語で書く
- コミットは `feat:` `fix:` `chore:` のあとに `Task番号: 内容` を続ける
- コミット前に `git status` と `git diff` で、タスク以外の変更が混ざっていないか確認する
- リリースバージョンは `package.json` の `version` で管理する
