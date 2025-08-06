const jsdoc = require( 'eslint-plugin-jsdoc' );

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly'
      }
    },
    plugins: {
      jsdoc
    },
    rules: {
      'indent': ['error', 2],
      'semi': ['error', 'always'],
      'eol-last': [2, 'always'],
      'linebreak-style': [0, 'unix'],
      'space-in-parens': ['error', 'always'],
      'space-before-function-paren': ['error', 'always'],
      'no-console': 'off',
      'no-unused-vars': ['warn', 
        { 
          'args': 'after-used',
          argsIgnorePattern: '^_', // 忽略 _ 开头的参数
          varsIgnorePattern: '^_', // 忽略 _ 开头的变量 
        }
      ],
      'no-process-exit': 'off',
      'space-infix-ops': ['error', { 'int32Hint': false }],
      'jsdoc/require-jsdoc': 'error',
      'jsdoc/check-types': 'warn',
      'jsdoc/valid-types': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-param-name': 'error',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-type': 'error',
      'jsdoc/require-returns-description': 'off'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'log/**',
      'doc/**',
      '*.min.js',
      'coverage/**',
      'dist/**',
      'build/**'
    ]
  }
]; 
