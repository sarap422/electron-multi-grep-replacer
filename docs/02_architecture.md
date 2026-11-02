# 02_architecture.md（システム設計書）

対象バージョン: v1.1.3

## 1. 全体構成

main / preload / renderer の3プロセス構成です。レンダラーはNode.jsに直接アクセスせず、preload が公開する `window.electronAPI` だけを使います。

```
renderer（UI）
   │  window.electronAPI.*
preload（contextBridge）
   │  ipcRenderer.invoke / send
main（ファイル操作・エンジン）
```

## 2. ファイル構成

```
src/
├── main/
│   ├── main.js                 # 起動・ウィンドウ・IPCハンドラー
│   ├── config-manager.js       # 設定の読み込み・保存・検証
│   ├── file-operations.js      # ファイル読み書き・権限確認
│   ├── file-search-engine.js   # 対象ファイルの列挙
│   ├── replacement-engine.js   # 内容の置換とリネーム
│   ├── grep-engine.js          # 内容・ファイル名の検索
│   ├── target-options.js       # エスケープ解釈・名前の分割・名前の検証（純粋関数）
│   ├── window-security.js      # 画面遷移の制限・IPC送信元の検証
│   ├── performance-optimizer.js# 処理戦略（置換の実行経路では未使用）
│   ├── memory-manager.js       # メモリ監視
│   ├── debug-logger.js         # ログ・性能計測
│   └── single-instance-test.js # シングルインスタンス確認用
├── preload/preload.js          # contextBridge によるAPI公開
└── renderer/
    ├── index.html
    ├── css/                    # main / components / themes / animations /
    │                           # execution-ui / template-manager
    └── js/
        ├── ui-controller.js        # 画面全体の制御・設定・Grep
        ├── execution-controller.js # 置換の実行・進捗・結果・CSV
        ├── replacement-ui.js       # ルール行の管理（RuleManager）
        ├── template-manager.js     # テンプレート・履歴
        ├── theme-switcher.js       # テーマ
        ├── performance-monitor.js  # UI応答性の計測
config/
├── default.json                # 既定設定（extraResources で同梱）
└── sample-configs/             # 設定のサンプル
tests/                          # Jest
```

UIの所有者は1か所に決めます。結果モーダルのボタンは `ExecutionController`、Grepモーダルは `UIController` が扱います。新しいUIは `UIController` 側に追加します。

## 3. 主要な処理の流れ

### 3.1 置換

```
ExecutionController.gatherExecutionConfig()
  → electronAPI.executeReplacement(config)
  → main: FileSearchEngine.searchFiles()（フォルダごと）
  → ReplacementEngine.processFiles(files, rules, targetOptions)
      1. 有効なルールを抽出し、必要ならエスケープを解釈
      2. _processBatch: 内容を置換（最大10ファイルを並列）
      3. _renameFiles: ファイル名を置換（直列）
      各区切りの _canContinue() で一時停止と停止を確認
  → ExecutionController: buildResultRows() で結果を表示
```

`executeReplacement` の開始時に `prepareRun()` を呼ぶので、ファイル検索中の Stop / Pause も受け付けます。停止は例外にせず、`cancelled: true` と部分結果を返します。Pause / Stop ボタンの所有者は `ExecutionController` です。

`buildResultRows()` が結果の唯一のデータ源です。画面表示、コピー、CSVはすべてここから作ります。

### 3.2 検索

```
UIController.handleGrepSearch()
  → electronAPI.grepSearch(config)
  → main: FileSearchEngine.searchFiles()
  → GrepEngine.search(files, patterns, options)
      ファイルごとに findNameMatches → findMatches
```

ファイル名の一致は `target: 'filename'`、`line: 0` で返します。バイナリやサイズ超過のファイルでも名前は検索します。

### 3.3 リネームを直列にする理由

`fs.rename` は既存ファイルを黙って上書きします。並列に実行すると、同じ名前に変わる2ファイルが存在確認をすり抜け、片方が消えます。また大文字小文字だけの変更は、大小を区別しないファイルシステムでは変更先が自分自身として見つかるため、`lstat` の `ino` と `dev` を比べて判定します。

## 4. IPC API

`config` は `invoke` で渡すオブジェクトです。ハンドラーは `handleIpc()` で登録し、送信元が自分の `index.html` でなければ拒否します。

### executeReplacement

```javascript
// 要求
{
  targetFolders: ['/path/a'],
  extensions: '.html,.css',
  rules: [{ id, from, to, enabled }],
  targetOptions: { includeFileName, includeExtension, interpretEscapes },
  options: { caseSensitive, maxFileSize, maxConcurrentFiles },
}

// 応答
{
  success: true,
  cancelled: false,   // Stop で止めた場合は true（results は部分結果）
  stats: { totalFiles, processedFiles, changedFiles, renamedFiles, totalChanges, errors },
  results: [{
    path, modified, replacements, changes, details, error,
    renamedTo,      // リネーム成功時の新しいパス
    renameError,    // リネーム失敗の理由
    attemptedName,  // 失敗したときの変更先の名前
  }],
}
```

### grep-search

```javascript
// 要求
{ targetFolders, extensions, patterns, caseSensitive, targetOptions }

// 応答
{
  success: true,
  results: [{ path, line, col, text, hlStart, hlLen, target }],
  stats: { totalFiles, scannedFiles, matchedFiles, totalMatches, skipped, truncated, errors },
}
```

### その他のチャンネル

| 分類 | チャンネル |
|---|---|
| 基本 | `ping` `get-version` `get-app-info` `vibe-log` |
| 設定 | `load-config` `save-config`（ダイアログ専用）`get-default-config` `get-recent-configs` |
| ファイル | `select-folder` `validate-folder-path` `find-files` |
| 検索 | `search-files` `cancel-search` `get-search-stats` `grep-cancel` |
| 置換 | `cancel-replacement` `pause-replacement` `resume-replacement` `get-replacement-stats` |
| 性能 | `get-performance-stats` `optimize-memory` `optimize-file-processing` |
| 進捗通知 | `replacement-progress` `grep-progress` |

## 5. 設定JSON

```json
{
  "app_info": { "name": "...", "version": "1.0.0", "description": "..." },
  "target_folder": "/path/a",
  "target_folders": ["/path/a", "/path/b"],
  "replacements": [
    { "id": "rule-1", "from": "old", "to": "new", "enabled": true, "description": "" }
  ],
  "target_settings": {
    "file_extensions": [".html", ".css"],
    "exclude_patterns": ["node_modules/**", ".git/**", "dist/**", "build/**"],
    "include_subdirectories": true,
    "max_file_size": 104857600,
    "encoding": "utf-8"
  },
  "replacement_settings": {
    "case_sensitive": true,
    "use_regex": false,
    "backup_enabled": false,
    "include_file_name": false,
    "include_extension": false,
    "interpret_escapes": false
  },
  "ui_settings": { "theme": "auto" }
}
```

`target_folder` は旧形式との互換用です。読み込みでは `target_folders` を優先します。

## 6. Electron固有の制約

開発版は動くのにパッケージ版が起動しない問題の主因です。

- 環境判定は `app.isPackaged` を使う（`NODE_ENV` は使わない）
- HTMLは `loadFile()` で読み込む
- ウィンドウは `show: true` で生成する（`ready-to-show` が発火しないことがある）
- 設定ファイルのパスは `app.isPackaged` で切り替える。`config/default.json` は `extraResources` で同梱する
- `requestSingleInstanceLock()` を呼び、`second-instance` を処理する

## 7. セキュリティ

- `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`、`webSecurity: true`
- IPCの追加は preload の `contextBridge` 経由のみ。ハンドラーは `ipcMain.handle` ではなく `handleIpc()` で登録する
- `applyWindowSecurity()` で、アプリのページ以外への遷移と新しいウィンドウを拒否する
- URLの比較は文字列ではなく、パスへ戻して行う（`isAppUrl()`）。空白や日本語の表記揺れで全IPCが止まるのを防ぐ
- CSPの `script-src` は `'self'` のみ。インラインスクリプトと `on*` 属性は使えない。`style-src` の `'unsafe-inline'` は動的な `<style>` と `style` 属性のために残している
- レンダラーから任意のパスを読み書きするAPIを公開しない。設定ファイルはダイアログで選ぶ
- preload は `electron` 以外を `require` しない（サンドボックスで読み込めない）
- ユーザー値を `innerHTML` の属性へ文字列で埋め込まない。生成後に `.value` や `.textContent` で設定する
- ファイル名やエラー文を含む通知は `textContent` で表示する（`showError`、`showSuccess`、`showToast`）
- リネーム先は `validateNewName()` で検証してから `path.join` する
- CSVの数式評価は `ExecutionController.escapeCsvCell()` で防ぐ

## 8. ビルド

- ビルド設定は `package.json` の `build` で管理する
- 成果物名は `version` に連動する（`dist/MultiGrepReplacer-<version>.dmg`）
- `dmg.backgroundColor` は小文字のhexで書く。大文字はdmgbuildがエラーにする
- dmgの生成には PATH 上の `python` が必要（`03_development-workflow.md` を参照）
