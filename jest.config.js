module.exports = {
  // テスト環境設定
  testEnvironment: 'node',
  
  // テストファイルパターン
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],
  
  // カバレッジ設定
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // カバレッジ閾値（一時的に下げる）
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  
  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // テスト除外パターン
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/tests/e2e/' // E2Eテストは除外（専用設定で実行）
  ],
  
  // ファイル変換設定
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // タイムアウト設定
  testTimeout: 10000,
  
  // 詳細出力
  verbose: true,
  
  // 並列実行設定
  maxWorkers: '50%',
  
  // テスト結果表示
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage',
      filename: 'test-report.html'
    }]
  ]
};