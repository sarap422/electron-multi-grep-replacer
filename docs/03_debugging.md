# 3_debugging.md（デバッグ・動作確認方針書）

## 🎯 デバッグ環境整備の目的

### 前回失敗の教訓
```
❌ 前回の問題：
- 最終パッケージングまで実行ファイル作成なし
- 「エラーが発生しました」→ 原因不明
- デバッグをClaude Codeに任せきり
- 段階的動作確認の欠如

✅ 今回の改善：
- 各Task完了時の即座動作確認
- 詳細なエラー情報と解決方法提示
- 早期実行ファイル（.app）作成
- 段階的テスト環境の構築
- ログファイルによる問題追跡可能
```

### 目標設定
- **UI応答性**: 100ms以内のボタンクリック反応
- **エラー可視化**: 具体的なエラー内容と解決方法
- **段階的品質保証**: 各Task完了時の動作確認
- **知識蓄積**: 問題解決パターンの記録・再利用
- **型安全性**: データ型変更時の影響範囲の完全把握
- **起動安定性**: シングルインスタンス制御の確実な動作


## 🚀 1. Vibe Logger統合システム（**重要**）

### 1.1 Vibe Logger とは？
- ライブラリ: vibelogger
- 使い方: https://github.com/fladdict/vibe-logger
- vibeloggerはコーディングエージェント用に高度な構造化データを出力するロガーです。
- ログにはvibeloggerを可能な限り利用し、ログからAIが自律的に何が起きてるかを把握できるようにする
- vibeloggerにはステップ、プロセス、コンテキスト情報、TODOなど様々な情報を構造化して記録できます。
- デバッグ時には./logsの出力を参照する

### 1.2 Vibe Logger初期化（**必須実装**）

#### ✅ Vibe Logger のインストール

**Python でのインストール**
```
pip install vibelogger
```

**Node.js でのインストール**
```
npm install vibelogger
```

#### ✅ メインプロセスでの初期化
```javascript
// src/main/main.js の最上部で実装
const { createFileLogger } = require('vibelogger');

// プロジェクト用ロガーの作成（グローバル）
global.vibeLogger = createFileLogger('multi-grep-replacer');

// アプリケーション起動ログ
global.vibeLogger.info('app_startup', 'Multi Grep Replacer starting', {
    context: {
        version: '1.0.0',
        platform: process.platform,
        nodeVersion: process.version,
        electronVersion: process.versions.electron
    },
    humanNote: 'アプリケーション起動時の環境情報',
    aiTodo: 'パフォーマンス改善の提案があれば記録'
});
```

#### ✅ レンダラープロセスへの公開
```javascript
// src/preload/preload.js に追加
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vibeLogger', {
    info: (operation, message, options) => 
        ipcRenderer.invoke('vibe-log', 'info', operation, message, options),
    error: (operation, message, options) => 
        ipcRenderer.invoke('vibe-log', 'error', operation, message, options),
    warning: (operation, message, options) => 
        ipcRenderer.invoke('vibe-log', 'warning', operation, message, options),
    debug: (operation, message, options) => 
        ipcRenderer.invoke('vibe-log', 'debug', operation, message, options)
});
```

#### ✅ IPCハンドラー実装
```javascript
// src/main/main.js に追加
const { ipcMain } = require('electron');

// Vibe Logger IPC ハンドラー
ipcMain.handle('vibe-log', async (event, level, operation, message, options) => {
    try {
        await global.vibeLogger[level](operation, message, options);
        return { success: true };
    } catch (error) {
        console.error(`Vibe Logger error: ${error.message}`);
        return { success: false, error: error.message };
    }
});
```

### 1.2 ログ出力先と確認方法

#### 📁 ログファイルの場所
```
./logs/vibe/
├── vibe_20250806_173000.log    # タイムスタンプ付きログファイル
├── vibe_20250806_180000.log    # 自動ローテーション
└── vibe_20250806_183000.log
```

#### 🔍 ログ確認コマンド
```bash
# 最新ログを確認
tail -n 50 logs/vibe/vibe_*.log

# 特定の操作を検索
grep "operation_name" logs/vibe/vibe_*.log

# JSON形式で整形表示
cat logs/vibe/vibe_*.log | jq '.'
```

### 1.3 実装パターン例

#### UI操作のログ記録
```javascript
// src/renderer/js/ui-controller.js
handleAddRule() {
    const startTime = performance.now();
    
    // Vibe Logger記録
    window.vibeLogger.info('rule_add_start', 'ルール追加開始', {
        context: {
            timestamp: new Date().toISOString(),
            component: 'RuleManager'
        }
    });
    
    try {
        const rule = this.ruleManager.addRule();
        const responseTime = performance.now() - startTime;
        
        // 成功ログ
        window.vibeLogger.info('rule_add_success', 'ルール追加成功', {
            context: {
                ruleId: rule.id,
                responseTime: responseTime,
                targetAchieved: responseTime <= 100
            },
            aiTodo: responseTime > 100 ? 'パフォーマンス改善が必要' : null
        });
        
    } catch (error) {
        // エラーログ
        window.vibeLogger.error('rule_add_error', 'ルール追加失敗', {
            context: {
                error: error.message,
                stack: error.stack
            },
            aiTodo: 'エラーハンドリングの改善提案'
        });
    }
}
```




## 🚨 2. 頻発問題の予防システム（Vibe Logger活用）

### 2.1 シングルインスタンス制御（ログ付き）

```javascript
// src/main/main.js
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // Vibe Loggerに記録
    global.vibeLogger.warning('single_instance_blocked', '既存インスタンスが起動中', {
        context: {
            timestamp: new Date().toISOString(),
            pid: process.pid
        },
        humanNote: '2つ目のインスタンスが起動を試みました'
    });
    
    app.quit();
    process.exit(0);
} else {
    // 成功ログ
    global.vibeLogger.info('single_instance_acquired', 'インスタンスロック取得成功', {
        context: {
            timestamp: new Date().toISOString(),
            pid: process.pid
        }
    });
}
```

### 2.2 パフォーマンス監視（Vibe Logger活用）

```javascript
// src/renderer/js/performance-monitor.js
class PerformanceMonitor {
    recordResponse(operation, responseTime) {
        const targetAchieved = responseTime <= this.UI_RESPONSE_TARGET;
        
        // Vibe Loggerに記録
        window.vibeLogger.info('performance_measurement', `${operation}のパフォーマンス`, {
            context: {
                operation: operation,
                responseTime: responseTime,
                target: this.UI_RESPONSE_TARGET,
                targetAchieved: targetAchieved,
                level: this.getPerformanceLevel(responseTime)
            },
            aiTodo: !targetAchieved ? `${operation}の処理を最適化してください` : null
        });
    }
}
```

## 🔧 3. Electron特有エラーの予測と対策（強化版）

### 3.1 IPC通信エラー（型安全性追加）
```javascript
// src/main/ipc-type-safe.js
class IPCTypeSafeHandler {
    static registerHandlers() {
        // 型安全なファイル操作ハンドラー
        ipcMain.handle('file-operations:replace', async (event, args) => {
            // 入力検証
            const validation = this.validateReplaceArgs(args);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: 'INVALID_ARGUMENTS',
                    details: validation.errors,
                    type: 'ValidationError'
                };
            }
            
            try {
                const result = await ReplacementEngine.process(args);
                
                // 出力検証
                const outputValidation = TypeValidator.validateReplacementResult(result);
                if (!outputValidation.isValid) {
                    console.error('❌ IPC output type validation failed:', outputValidation.errors);
                    // 開発環境では型エラーを表示
                    if (process.env.NODE_ENV === 'development') {
                        throw new Error(`Type validation failed: ${outputValidation.errors.join(', ')}`);
                    }
                }
                
                return {
                    success: true,
                    data: result,
                    type: 'ReplacementResult'
                };
                
            } catch (error) {
                return {
                    success: false,
                    error: error.code || 'UNKNOWN_ERROR',
                    message: error.message,
                    type: 'ProcessingError'
                };
            }
        });
    }
    
    static validateReplaceArgs(args) {
        const errors = [];
        
        if (!args || typeof args !== 'object') {
            errors.push('Arguments must be an object');
            return { isValid: false, errors };
        }
        
        // 必須フィールド検証
        const requiredFields = ['targetDirectory', 'rules', 'options'];
        requiredFields.forEach(field => {
            if (!(field in args)) {
                errors.push(`Missing required field: ${field}`);
            }
        });
        
        // 型検証
        if (args.targetDirectory && typeof args.targetDirectory !== 'string') {
            errors.push('targetDirectory must be string');
        }
        
        if (args.rules && !Array.isArray(args.rules)) {
            errors.push('rules must be array');
        }
        
        if (args.options && typeof args.options !== 'object') {
            errors.push('options must be object');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}
```

### 3.2 Context Isolation設定問題（セキュリティ強化）
```javascript
// src/main/security-validator-enhanced.js
class SecurityValidatorEnhanced {
    static validateWebPreferences(webPreferences) {
        const issues = [];
        const warnings = [];
        
        // 必須セキュリティ設定
        const requiredSettings = {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true
        };
        
        Object.entries(requiredSettings).forEach(([key, expectedValue]) => {
            if (webPreferences[key] !== expectedValue) {
                issues.push({
                    setting: key,
                    expected: expectedValue,
                    actual: webPreferences[key],
                    severity: 'CRITICAL',
                    message: `Security setting ${key} must be ${expectedValue}`
                });
            }
        });
        
        // 推奨設定
        const recommendedSettings = {
            allowRunningInsecureContent: false,
            experimentalFeatures: false
        };
        
        Object.entries(recommendedSettings).forEach(([key, expectedValue]) => {
            if (webPreferences[key] !== expectedValue) {
                warnings.push({
                    setting: key,
                    expected: expectedValue,
                    actual: webPreferences[key],
                    severity: 'WARNING',
                    message: `Recommended setting ${key} should be ${expectedValue}`
                });
            }
        });
        
        // preload スクリプトの存在確認
        if (!webPreferences.preload) {
            issues.push({
                setting: 'preload',
                expected: 'valid file path',
                actual: webPreferences.preload,
                severity: 'CRITICAL',
                message: 'preload script is required for secure API access'
            });
        } else {
            // preload ファイルの存在確認
            const fs = require('fs');
            if (!fs.existsSync(webPreferences.preload)) {
                issues.push({
                    setting: 'preload',
                    expected: 'existing file',
                    actual: webPreferences.preload,
                    severity: 'CRITICAL',
                    message: `preload script file not found: ${webPreferences.preload}`
                });
            }
        }
        
        return {
            isSecure: issues.length === 0,
            issues: issues,
            warnings: warnings,
            score: this.calculateSecurityScore(issues, warnings)
        };
    }
    
    static calculateSecurityScore(issues, warnings) {
        const maxScore = 100;
        const criticalPenalty = 25;
        const warningPenalty = 5;
        
        const penalty = (issues.length * criticalPenalty) + (warnings.length * warningPenalty);
        return Math.max(0, maxScore - penalty);
    }
    
    static generateSecurityReport(validation) {
        const report = {
            timestamp: new Date().toISOString(),
            score: validation.score,
            status: validation.isSecure ? 'SECURE' : 'INSECURE',
            issues: validation.issues,
            warnings: validation.warnings,
            recommendations: []
        };
        
        // 修正提案を生成
        validation.issues.forEach(issue => {
            report.recommendations.push({
                type: 'FIX_REQUIRED',
                setting: issue.setting,
                action: `Set ${issue.setting} to ${issue.expected}`,
                code: `webPreferences.${issue.setting} = ${issue.expected};`
            });
        });
        
        validation.warnings.forEach(warning => {
            report.recommendations.push({
                type: 'IMPROVEMENT',
                setting: warning.setting,
                action: `Consider setting ${warning.setting} to ${warning.expected}`,
                code: `webPreferences.${warning.setting} = ${warning.expected};`
            });
        });
        
        return report;
    }
}
```


## 🧪 4. 段階的テスト環境の設計（強化版）

### 4.1 Task完了時テストフレームワーク（型安全性追加）

#### 強化されたテスト実行スクリプト
```javascript
// scripts/enhanced-test-runner.js
class EnhancedTestRunner {
    static async runComprehensiveTests(phase) {
        console.log(`🧪 Running comprehensive Phase ${phase} tests...`);
        
        const results = {
            singleInstance: null,
            typeSync: null,
            security: null,
            performance: null,
            functional: null,
            package: null
        };
        
        try {
            // 1. シングルインスタンス制御テスト
            console.log('🔒 Testing single instance control...');
            results.singleInstance = await this.testSingleInstance();
            
            // 2. 型同期確認テスト
            console.log('🔢 Testing type synchronization...');
            results.typeSync = await this.testTypeSync();
            
            // 3. セキュリティ設定テスト
            console.log('🛡️ Testing security configuration...');
            results.security = await this.testSecurity();
            
            // 4. パフォーマンステスト
            console.log('⚡ Testing performance...');
            results.performance = await this.testPerformance();
            
            // 5. 機能テスト
            console.log('⚙️ Testing functionality...');
            results.functional = await this.testFunctionality(phase);
            
            // 6. パッケージテスト
            console.log('📦 Testing package...');
            results.package = await this.testPackage();
            
            // 結果サマリー
            const summary = this.generateTestSummary(results);
            console.log('📊 Test Summary:', summary);
            
            if (!summary.allPassed) {
                throw new Error(`Tests failed: ${summary.failedTests.join(', ')}`);
            }
            
            console.log(`✅ All Phase ${phase} tests passed successfully`);
            return results;
            
        } catch (error) {
            console.error(`❌ Phase ${phase} tests failed:`, error.message);
            console.log('📋 Detailed results:', results);
            throw error;
        }
    }
    
    static async testSingleInstance() {
        const SingleInstanceValidator = require('./test-single-instance');
        
        // コード検証
        const codeValidation = SingleInstanceValidator.validateImplementation('src/main/main.js');
        if (!codeValidation.isValid) {
            return {
                passed: false,
                type: 'code_validation',
                issues: codeValidation.issues
            };
        }
        
        // 動作テスト
        const behaviorTest = await SingleInstanceValidator.testInstanceBehavior();
        const allBehaviorsPassed = Object.values(behaviorTest).every(result => result === true);
        
        return {
            passed: allBehaviorsPassed,
            type: 'behavior_test',
            details: behaviorTest,
            codeValidation: codeValidation
        };
    }
    
    static async testTypeSync() {
        const TestTypeSyncValidator = require('../tests/helpers/type-sync-validator');
        
        const validation = TestTypeSyncValidator.validateTestSync();
        
        if (!validation.isValid) {
            // 自動修正を試行
            const autoFixResults = [];
            validation.issues.forEach(issue => {
                if (issue.severity === 'HIGH') {
                    const fixResult = TestTypeSyncValidator.generateAutoFix(issue.file);
                    autoFixResults.push(fixResult);
                }
            });
            
            // 修正後に再検証
            const revalidation = TestTypeSyncValidator.validateTestSync();
            
            return {
                passed: revalidation.isValid,
                type: 'type_sync',
                originalIssues: validation.issues,
                autoFixApplied: autoFixResults.length > 0,
                finalValidation: revalidation
            };
        }
        
        return {
            passed: true,
            type: 'type_sync',
            issues: []
        };
    }
    
    static async testSecurity() {
        const SecurityValidatorEnhanced = require('../src/main/security-validator-enhanced');
        
        // セキュリティ設定を取得（模擬）
        const mockWebPreferences = {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            preload: 'src/preload/preload.js'
        };
        
        const validation = SecurityValidatorEnhanced.validateWebPreferences(mockWebPreferences);
        const report = SecurityValidatorEnhanced.generateSecurityReport(validation);
        
        return {
            passed: validation.isSecure && validation.score >= 90,
            type: 'security',
            score: validation.score,
            report: report
        };
    }
    
    static generateTestSummary(results) {
        const testTypes = Object.keys(results);
        const failedTests = testTypes.filter(type => 
            results[type] && !results[type].passed
        );
        
        return {
            totalTests: testTypes.length,
            passedTests: testTypes.length - failedTests.length,
            failedTests: failedTests,
            allPassed: failedTests.length === 0,
            successRate: ((testTypes.length - failedTests.length) / testTypes.length * 100).toFixed(1)
        };
    }
}

module.exports = EnhancedTestRunner;
```


## 📋 5. 継続的品質保証プロセス（強化版）

### 5.1 Task完了チェックリスト
```markdown
各Task完了時の必須確認項目：

### シングルインスタンス制御確認（Critical）
- [ ] SingleInstanceValidator.validateImplementation() 通過
- [ ] シングルインスタンス制御が最上位で実装されている
- [ ] second-instanceイベントハンドラーが適切に実装されている
- [ ] ウィンドウ復元・フォーカス処理が完全に動作する
- [ ] 2回連続起動テストで正常動作確認

### データ型安全性確認（Critical）
- [ ] TestTypeSyncValidator.validateTestSync() 通過
- [ ] 変更されたデータ型に対応するテストがすべて更新済み
- [ ] TypeValidator.validateReplacementResult() でエラーなし
- [ ] 実装変更時の型定義文書が更新済み
- [ ] 危険なテストパターン（toHaveLength、配列アクセス）なし

### 基本動作確認
- [ ] npm start でアプリケーション正常起動
- [ ] ESLint チェック通過（警告0件）
- [ ] 基本テストスイート全項目PASS
- [ ] メモリ使用量が200MB以下

### セキュリティ確認
- [ ] SecurityValidatorEnhanced でスコア90以上
- [ ] contextIsolation: true, nodeIntegration: false
- [ ] preload.js でのAPI公開が適切
- [ ] セキュリティベストプラクティス準拠

### パフォーマンス確認（Phase 3以降）
- [ ] UI応答性100ms以内（PerformanceMonitor確認）
- [ ] メインスレッドブロッキングなし
- [ ] 大容量ファイル処理での安定動作
- [ ] VibeDebugLogger でパフォーマンス閾値内

### 実行ファイル確認（適用可能な場合）
- [ ] npm run build:dev で.appファイル作成成功
- [ ] .appファイル単体起動確認（1回目）
- [ ] .appファイル2回目起動確認（シングルインスタンス制御）
- [ ] パッケージ版での全機能動作確認
- [ ] パッケージ版でのセキュリティ設定維持確認

### AI分析・記録
- [ ] VibeDebugLogger で構造化ログ出力確認
- [ ] 問題発生時のパターン記録
- [ ] 知識ベース（PATTERNS.md）更新
- [ ] Claude Code 向け改善提案生成
```

### 5.2 問題発生時のトリアージ

#### 重要度レベル定義（シングルインスタンス・型安全性追加）
```markdown
🔴 Critical（即座対応・作業停止）:
- シングルインスタンス制御の完全失敗（アプリが起動しない）
- データ型エラーによるテスト大量失敗
- アプリケーションが起動しない
- 基本機能が全く動作しない
- セキュリティ設定でCritical判定
- データ破損・ファイル削除が発生

🟡 High（当日対応）:
- シングルインスタンス制御の部分的失敗（2回目起動でウィンドウ非表示）
- データ型不整合によるテスト一部失敗
- UI応答性が目標値（100ms）を大幅超過
- エラーメッセージが不適切・無意味
- 特定条件下での機能不全
- セキュリティスコア70未満

🟢 Medium（翌日対応）:
- 軽微なUI表示不具合
- 非重要機能の動作不安定
- パフォーマンス軽微劣化
- セキュリティスコア90未満
- 型検証の軽微な警告

🔵 Low（時間あるとき対応）:
- UIデザイン微調整
- ログメッセージ改善
- コードリファクタリング
- VibeLogger出力の最適化
```

## 🔧 5.3. デバッグ手順（Vibe Logger活用）

### Step 1: ログ生成確認
```bash
# アプリ起動
npm start

# 別ターミナルでログ監視
watch -n 1 "ls -la logs/vibe/"
tail -f logs/vibe/vibe_*.log
```

### Step 2: 問題分析
```bash
# エラーログ抽出
grep '"level":"ERROR"' logs/vibe/vibe_*.log | jq '.'

# パフォーマンス問題抽出
grep '"targetAchieved":false' logs/vibe/vibe_*.log | jq '.'
```

### Step 3: AI分析用データ取得
```javascript
// コンソールで実行
const { readFileSync } = require('fs');
const logs = readFileSync('logs/vibe/vibe_latest.log', 'utf8')
    .split('\n')
    .filter(line => line)
    .map(line => JSON.parse(line));

// Claude/ChatGPTに提供
console.log(JSON.stringify(logs, null, 2));
```

## 🎯 6. まとめ：期待される成果

### Before（問題頻発）
```
問題発生パターン：
- シングルインスタンス制御エラー → アプリ即座終了 → 原因不明で作り直し
- データ型変更 → テスト大量失敗 → 1つずつ手動修正 → 時間浪費
- 実装・テスト非同期 → 品質劣化 → 信頼性低下
```

### After（予防的品質保証）
```
改善されたフロー：
- 事前検証 → 問題予防 → 安定開発 → 高品質アプリ
- 自動検出 → 自動修正 → 迅速解決 → 継続的改善
- 構造化ログ → AI分析 → パターン学習 → 知識蓄積
```

### 期待される具体的成果
1. **シングルインスタンス制御エラー**: 100%予防（検証・テストの標準化）
2. **データ型エラー**: 80%削減（自動検証・自動修正システム）
3. **問題追跡**: すべての操作が記録され、問題の原因特定が容易
4. **AI支援**: 構造化ログによりClaude/ChatGPTが的確な改善提案
5. **知識蓄積**: aiTodoフィールドに改善アイデアが蓄積

この強化されたデバッグ環境により、頻発する問題パターンを根本的に解決し、安定したElectronアプリケーションを確実に開発できます。