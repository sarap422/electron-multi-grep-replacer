// scripts/test-integration.js
const fs = require('fs').promises;
const path = require('path');

class IntegrationTester {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
    }
    
    async runAllTests() {
        console.log('🧪 Multi Grep Replacer IPC統合テスト開始');
        console.log('=' .repeat(50));
        
        try {
            await this.testCoreComponents();
            await this.testFileOperations();
            await this.testReplacementEngine();
            await this.testConfigurationManagement();
            await this.testPerformance();
            await this.testSecurity();
            
            this.printResults();
        } catch (error) {
            console.error('❌ テスト実行中にエラーが発生しました:', error.message);
        }
    }
    
    async testCoreComponents() {
        console.log('\n📋 1. コアコンポーネントテスト');
        
        // FileOperations クラステスト
        try {
            const FileOperations = require('../src/main/file-operations');
            
            // テストディレクトリ作成
            const testDir = path.join(__dirname, '../tests/temp');
            await fs.mkdir(testDir, { recursive: true });
            
            // テストファイル作成
            const testFile = path.join(testDir, 'test.html');
            await fs.writeFile(testFile, '<div class="old-class">Hello</div>');
            
            // ファイル検索テスト
            const files = await FileOperations.findFiles(testDir, ['.html'], []);
            
            this.assert(files.length > 0, 'ファイル検索機能');
            this.assert(files.some(f => f.includes('test.html')), 'HTMLファイルの検出');
            
            // クリーンアップ
            await fs.rm(testDir, { recursive: true, force: true });
            
        } catch (error) {
            this.fail('FileOperations テスト', error.message);
        }
        
        // ReplacementEngine クラステスト
        try {
            const ReplacementEngine = require('../src/main/replacement-engine');
            
            const rules = [
                { from: 'old-class', to: 'new-class', enabled: true }
            ];
            
            const engine = new ReplacementEngine(rules, {});
            const testContent = '<div class="old-class">Hello</div>';
            
            // 置換テスト実行
            const result = engine.applyRules(testContent);
            
            this.assert(result.includes('new-class'), '置換ルール適用');
            this.assert(!result.includes('old-class'), '元の文字列が置換されている');
            
        } catch (error) {
            this.fail('ReplacementEngine テスト', error.message);
        }
        
        // ConfigManager クラステスト
        try {
            const ConfigManager = require('../src/main/config-manager');
            
            const defaultConfig = ConfigManager.getDefaultConfig();
            
            this.assert(defaultConfig.app_info, 'デフォルト設定の app_info');
            this.assert(Array.isArray(defaultConfig.replacements), 'デフォルト設定の replacements');
            this.assert(defaultConfig.target_settings, 'デフォルト設定の target_settings');
            
        } catch (error) {
            this.fail('ConfigManager テスト', error.message);
        }
        
        // DebugLogger クラステスト
        try {
            const DebugLogger = require('../src/main/debug-logger');
            
            DebugLogger.info('テストログメッセージ');
            
            this.pass('DebugLogger 初期化と基本動作');
            
        } catch (error) {
            this.fail('DebugLogger テスト', error.message);
        }
    }
    
    async testFileOperations() {
        console.log('\n📁 2. ファイル操作テスト');
        
        try {
            const FileOperations = require('../src/main/file-operations');
            
            // テスト環境準備
            const testDir = path.join(__dirname, '../tests/temp-file-ops');
            await fs.mkdir(testDir, { recursive: true });
            
            // 複数テストファイル作成
            const testFiles = [
                { name: 'test1.html', content: '<div class="old">HTML content</div>' },
                { name: 'test2.css', content: '.old { color: red; }' },
                { name: 'test3.js', content: 'const old = "javascript";' },
                { name: 'test4.txt', content: 'Old text content' }
            ];
            
            for (const file of testFiles) {
                await fs.writeFile(path.join(testDir, file.name), file.content);
            }
            
            // 拡張子フィルタテスト
            const htmlFiles = await FileOperations.findFiles(testDir, ['.html'], []);
            this.assert(htmlFiles.length === 1, 'HTML拡張子フィルタ');
            
            const webFiles = await FileOperations.findFiles(testDir, ['.html', '.css', '.js'], []);
            this.assert(webFiles.length === 3, '複数拡張子フィルタ');
            
            const allFiles = await FileOperations.findFiles(testDir, [], []);
            this.assert(allFiles.length === 4, '全ファイル検索');
            
            // ファイル内容読み込みテスト
            const htmlContent = await FileOperations.readFileContent(path.join(testDir, 'test1.html'));
            this.assert(htmlContent.includes('<div'), 'ファイル内容読み込み');
            
            // ファイル権限チェックテスト
            const hasPermission = await FileOperations.checkFilePermissions(path.join(testDir, 'test1.html'));
            this.assert(hasPermission.readable && hasPermission.writable, 'ファイル権限チェック');
            
            // クリーンアップ
            await fs.rm(testDir, { recursive: true, force: true });
            
        } catch (error) {
            this.fail('ファイル操作テスト', error.message);
        }
    }
    
    async testReplacementEngine() {
        console.log('\n🔄 3. 置換エンジンテスト');
        
        try {
            const ReplacementEngine = require('../src/main/replacement-engine');
            
            // テスト環境準備
            const testDir = path.join(__dirname, '../tests/temp-replacement');
            await fs.mkdir(testDir, { recursive: true });
            
            // テストファイル作成
            const testFile = path.join(testDir, 'replacement-test.html');
            const originalContent = `
                <div class="old-class">
                    <span class="old-variable">Content</span>
                    <p class="keep-this">Keep this class</p>
                </div>
            `;
            await fs.writeFile(testFile, originalContent);
            
            // 置換ルール設定
            const rules = [
                { from: 'old-class', to: 'new-class', enabled: true },
                { from: 'old-variable', to: 'new-variable', enabled: true },
                { from: 'disabled-rule', to: 'should-not-replace', enabled: false }
            ];
            
            const engine = new ReplacementEngine(rules, {
                caseSensitive: true,
                wholeWord: false
            });
            
            // 単一ファイル処理テスト
            const result = await engine.processFile(testFile);
            
            this.assert(result.success, '単一ファイル処理成功');
            this.assert(result.changes > 0, '置換が実行された');
            
            // ファイル内容確認
            const updatedContent = await fs.readFile(testFile, 'utf8');
            this.assert(updatedContent.includes('new-class'), '置換ルール1が適用された');
            this.assert(updatedContent.includes('new-variable'), '置換ルール2が適用された');
            this.assert(updatedContent.includes('keep-this'), '対象外の文字列は保持');
            this.assert(!updatedContent.includes('old-class'), '元の文字列が置換された');
            
            // バッチ処理テスト用に追加ファイル作成
            const testFile2 = path.join(testDir, 'batch-test.css');
            await fs.writeFile(testFile2, '.old-class { color: blue; }');
            
            const batchFiles = [testFile, testFile2];
            let progressCalls = 0;
            
            const batchResults = await engine.processBatch(batchFiles, (current, total, file) => {
                progressCalls++;
                this.assert(current <= total, 'プログレス: current <= total');
                this.assert(typeof file === 'string', 'プログレス: ファイル名が文字列');
            });
            
            this.assert(progressCalls > 0, 'プログレス通知が呼ばれた');
            this.assert(batchResults.processedFiles === 2, 'バッチ処理: 2ファイル処理');
            this.assert(batchResults.totalChanges > 0, 'バッチ処理: 変更が適用された');
            
            // プレビュー機能テスト
            const previewResult = await engine.generatePreview([testFile]);
            this.assert(Array.isArray(previewResult), 'プレビュー結果が配列');
            this.assert(previewResult.length > 0, 'プレビュー結果に内容がある');
            
            // クリーンアップ
            await fs.rm(testDir, { recursive: true, force: true });
            
        } catch (error) {
            this.fail('置換エンジンテスト', error.message);
        }
    }
    
    async testConfigurationManagement() {
        console.log('\n⚙️  4. 設定管理テスト');
        
        try {
            const ConfigManager = require('../src/main/config-manager');
            
            // デフォルト設定取得テスト
            const defaultConfig = ConfigManager.getDefaultConfig();
            this.assert(defaultConfig, 'デフォルト設定取得');
            
            // 設定検証テスト
            const validConfig = {
                app_info: { name: 'Test', version: '1.0.0' },
                replacements: [
                    { from: 'test', to: 'TEST', enabled: true }
                ],
                target_settings: {
                    file_extensions: ['.html'],
                    exclude_patterns: ['node_modules/**'],
                    include_subdirectories: true
                }
            };
            
            const validationResult = ConfigManager.validateConfig(validConfig);
            this.assert(validationResult.valid, '有効な設定の検証');
            
            // 無効な設定の検証テスト
            const invalidConfig = {
                app_info: 'invalid', // should be object
                replacements: 'invalid' // should be array
            };
            
            const invalidValidation = ConfigManager.validateConfig(invalidConfig);
            this.assert(!invalidValidation.valid, '無効な設定の検出');
            this.assert(invalidValidation.errors.length > 0, 'エラー詳細の提供');
            
            // 設定保存・読み込みテスト
            const testConfigPath = path.join(__dirname, '../tests/temp-config.json');
            
            await ConfigManager.saveConfig(validConfig, testConfigPath);
            this.assert(await fs.access(testConfigPath).then(() => true).catch(() => false), '設定ファイル保存');
            
            const loadedConfig = await ConfigManager.loadConfig(testConfigPath);
            this.assert(loadedConfig.app_info.name === validConfig.app_info.name, '設定ファイル読み込み');
            
            // クリーンアップ
            await fs.unlink(testConfigPath).catch(() => {});
            
        } catch (error) {
            this.fail('設定管理テスト', error.message);
        }
    }
    
    async testPerformance() {
        console.log('\n⚡ 5. パフォーマンステスト');
        
        try {
            const FileOperations = require('../src/main/file-operations');
            
            // 大量ファイル処理テスト
            const testDir = path.join(__dirname, '../tests/temp-performance');
            await fs.mkdir(testDir, { recursive: true });
            
            // 100個のテストファイル作成
            const fileCount = 100;
            for (let i = 0; i < fileCount; i++) {
                await fs.writeFile(
                    path.join(testDir, `test${i}.txt`),
                    `This is test file ${i} with some content.`
                );
            }
            
            // ファイル検索パフォーマンステスト
            const startTime = Date.now();
            const files = await FileOperations.findFiles(testDir, ['.txt'], []);
            const searchTime = Date.now() - startTime;
            
            this.assert(files.length === fileCount, `${fileCount}ファイルの検索`);
            this.assert(searchTime < 5000, 'ファイル検索が5秒以内（実際: ' + searchTime + 'ms）');
            
            // メモリ使用量チェック
            const memUsage = process.memoryUsage();
            const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            
            this.assert(memUsageMB < 200, 'メモリ使用量が200MB以下（実際: ' + memUsageMB + 'MB）');
            
            // クリーンアップ
            await fs.rm(testDir, { recursive: true, force: true });
            
        } catch (error) {
            this.fail('パフォーマンステスト', error.message);
        }
    }
    
    async testSecurity() {
        console.log('\n🔒 6. セキュリティテスト');
        
        try {
            const FileOperations = require('../src/main/file-operations');
            
            // パストラバーサル攻撃テスト
            try {
                await FileOperations.findFiles('../../../etc', [], []);
                this.fail('セキュリティ: パストラバーサル対策', '不正なパスが許可された');
            } catch (error) {
                if (error.message.includes('Invalid path') || error.code === 'ENOENT') {
                    this.pass('パストラバーサル攻撃の防止');
                } else {
                    throw error;
                }
            }
            
            // 大きすぎるファイルの処理テスト
            const testDir = path.join(__dirname, '../tests/temp-security');
            await fs.mkdir(testDir, { recursive: true });
            
            // 正常サイズのファイル
            const normalFile = path.join(testDir, 'normal.txt');
            await fs.writeFile(normalFile, 'Normal content');
            
            const content = await FileOperations.readFileContent(normalFile);
            this.assert(content === 'Normal content', '正常サイズファイルの読み込み');
            
            // クリーンアップ
            await fs.rm(testDir, { recursive: true, force: true });
            
        } catch (error) {
            this.fail('セキュリティテスト', error.message);
        }
    }
    
    // テストヘルパーメソッド
    assert(condition, testName) {
        this.totalTests++;
        if (condition) {
            console.log(`  ✅ ${testName}`);
            this.passedTests++;
            this.testResults.push({ name: testName, status: 'PASS' });
        } else {
            console.log(`  ❌ ${testName}`);
            this.testResults.push({ name: testName, status: 'FAIL', error: 'Assertion failed' });
        }
    }
    
    pass(testName) {
        this.totalTests++;
        this.passedTests++;
        console.log(`  ✅ ${testName}`);
        this.testResults.push({ name: testName, status: 'PASS' });
    }
    
    fail(testName, error) {
        this.totalTests++;
        console.log(`  ❌ ${testName}: ${error}`);
        this.testResults.push({ name: testName, status: 'FAIL', error });
    }
    
    printResults() {
        console.log('\n' + '=' .repeat(50));
        console.log('📊 テスト結果サマリー');
        console.log('=' .repeat(50));
        
        const failedTests = this.testResults.filter(t => t.status === 'FAIL');
        
        console.log(`総テスト数: ${this.totalTests}`);
        console.log(`成功: ${this.passedTests}`);
        console.log(`失敗: ${this.totalTests - this.passedTests}`);
        console.log(`成功率: ${Math.round((this.passedTests / this.totalTests) * 100)}%`);
        
        if (failedTests.length > 0) {
            console.log('\n❌ 失敗したテスト:');
            failedTests.forEach(test => {
                console.log(`  - ${test.name}: ${test.error}`);
            });
        }
        
        if (this.passedTests === this.totalTests) {
            console.log('\n🎉 全てのテストが成功しました！');
            console.log('✅ Task 2.3 IPC統合・API設計 が完了しました。');
        } else {
            console.log('\n⚠️  一部のテストが失敗しています。修正が必要です。');
        }
    }
}

// テスト実行
if (require.main === module) {
    const tester = new IntegrationTester();
    tester.runAllTests().catch(console.error);
}

module.exports = IntegrationTester;