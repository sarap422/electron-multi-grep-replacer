module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '16'
        }
      }
    ]
  ],
  env: {
    TEST: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current'
            }
          }
        ]
      ]
    }
  }
};