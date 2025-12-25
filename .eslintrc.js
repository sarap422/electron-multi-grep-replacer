module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'prettier'  // Prettierとの競合回避
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: [
    'prettier'
  ],
  rules: {
    // Prettier統合
    'prettier/prettier': 'error',
    
    // コード品質
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-console': 'off', // 開発時はconsole.logを許可
    'no-debugger': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-duplicate-imports': 'error',
    'no-unreachable': 'error',
    'no-unreachable-loop': 'error',
    
    // スタイル（Prettierに委譲するが基本ルールは保持）
    'indent': 'off', // Prettierに委譲
    'linebreak-style': 'off', // Prettierに委譲  
    'quotes': 'off', // Prettierに委譲
    'semi': 'off', // Prettierに委譲
    
    // セキュリティ
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // ベストプラクティス
    'eqeqeq': 'error',
    'no-magic-numbers': ['warn', { 
      'ignore': [-500, -20, -10, -1, 0, 0.8, 1, 2, 3, 4, 5, 7, 8, 10, 16, 20, 24, 30, 36, 50, 60, 90, 100, 200, 300, 400, 500, 1000, 1024, 2000, 3000, 4000, 5000, 10000, 30000, 60000, 300000], 
      'ignoreArrayIndexes': true,
      'ignoreDefaultValues': true
    }],
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'off', // Prettierに委譲
    'curly': 'error',
    'default-case': 'error',
    'dot-notation': 'error',
    'no-alert': 'error',
    'no-caller': 'error',
    'no-empty-function': 'warn',
    'no-lone-blocks': 'error',
    'no-multi-spaces': 'off', // Prettierに委譲
    'no-new': 'error',
    'no-return-assign': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    'prefer-promise-reject-errors': 'error',
    'radix': 'error',
    'yoda': 'error',
    
    // ES6+
    'arrow-body-style': ['error', 'as-needed'],
    'no-confusing-arrow': 'error',
    'no-duplicate-imports': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-constructor': 'error',
    'no-useless-rename': 'error',
    'object-shorthand': 'error',
    'prefer-destructuring': ['error', {
      'array': true,
      'object': true
    }],
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'prefer-template': 'error',
    
    // Electron特有
    'no-restricted-globals': ['error', 'require', 'process', '__dirname', '__filename']
  },
  overrides: [
    {
      // メインプロセスではNode.js APIを許可
      files: ['src/main/**/*.js'],
      rules: {
        'no-restricted-globals': 'off'
      }
    },
    {
      // PreloadスクリプトではrequireとprocessAPIを許可
      files: ['src/preload/**/*.js'],
      rules: {
        'no-restricted-globals': 'off'
      }
    },
    {
      // レンダラープロセスではprocessのバージョン情報アクセスを許可
      files: ['src/renderer/**/*.js'],
      rules: {
        'no-restricted-globals': ['error', 'require', '__dirname', '__filename']
      }
    },
    {
      // テストファイルでは一部ルールを緩和
      files: ['TESTs/**/*.js', '**/*.TEST.js'],
      rules: {
        'no-magic-numbers': 'off'
      }
    }
  ],
  globals: {
    // Electronプロセス別のグローバル変数
    electronAPI: 'readonly'
  }
};