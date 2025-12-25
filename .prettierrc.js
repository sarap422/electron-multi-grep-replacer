module.exports = {
  // 基本設定
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  
  // 末尾カンマ設定
  trailingComma: 'es5',
  
  // 括弧とスペース
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  
  // 改行設定
  endOfLine: 'lf',
  
  // 特定ファイル形式の設定オーバーライド
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always'
      }
    },
    {
      files: '*.html',
      options: {
        printWidth: 120,
        htmlWhitespaceSensitivity: 'css'
      }
    },
    {
      files: '*.css',
      options: {
        printWidth: 120
      }
    }
  ]
};