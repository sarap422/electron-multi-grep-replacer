/**
 * ESLint 設定
 * 整形は Prettier に任せ、ESLint はバグの検出を担当する。
 * プロセスごとに実行環境が違うため、overrides で分ける。
 */
module.exports = {
  root: true,
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  parserOptions: { ecmaVersion: 'latest' },
  rules: {
    curly: 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-unused-vars': ['warn', { args: 'none' }],
    'no-var': 'error',
    'prefer-const': 'error',
  },
  overrides: [
    {
      files: ['src/main/**/*.js'],
      env: { node: true, es2022: true },
    },
    {
      // preload はサンドボックスで動くため、Node.js のグローバルを許可しない
      files: ['src/preload/**/*.js'],
      env: { browser: true, commonjs: true, es2022: true },
    },
    {
      // レンダラーは module を使わない通常のスクリプト
      files: ['src/renderer/**/*.js'],
      env: { browser: true, es2022: true },
    },
    {
      files: ['tests/**/*.js'],
      env: { node: true, jest: true, es2022: true },
    },
  ],
};
