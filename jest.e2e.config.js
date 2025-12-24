module.exports = {
  // E2E テスト環境設定
  testEnvironment: 'node',
  
  // E2E テストファイルパターン
  testMatch: [
    '**/tests/e2e/**/*.test.js',
    '**/tests/e2e/**/*.spec.js'
  ],
  
  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.js'],
  
  // タイムアウト設定（E2Eテストは長時間）
  testTimeout: 30000,
  
  // 詳細出力
  verbose: true,
  
  // 並列実行無効（Electronアプリの競合回避）
  maxWorkers: 1,
  
  // テスト実行順序を順次に
  runInBand: true,
  
  // カバレッジ無効（E2Eテストではカバレッジ計測しない）
  collectCoverage: false,
  
  // テスト除外パターン
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/tests/unit/'
  ],
  
  // ファイル変換設定
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // グローバル変数設定
  globals: {
    'ELECTRON_PATH': './dist/mac-arm64/MultiGrepReplacer.app/Contents/MacOS/MultiGrepReplacer'
  }
};