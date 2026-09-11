import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '.next',
      'coverage',
      'node_modules',
      'next-env.d.ts',
      'app/(payload)/admin/importMap.js',
      'playwright-report',
      'test-results',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      '@next/next': nextPlugin,
      prettier: prettierPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      curly: ['error', 'all'],
      'prettier/prettier': 'error',
      semi: ['error', 'never'],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'function' },
        { blankLine: 'always', prev: 'function', next: '*' },
        { blankLine: 'always', prev: '*', next: 'if' },
        { blankLine: 'always', prev: 'if', next: '*' },
        { blankLine: 'always', prev: '*', next: 'try' },
        { blankLine: 'always', prev: 'try', next: '*' },
        { blankLine: 'always', prev: 'multiline-expression', next: '*' },
        { blankLine: 'always', prev: '*', next: 'multiline-expression' },
        { blankLine: 'always', prev: '*', next: 'return' },
        {
          blankLine: 'never',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },
        { blankLine: 'always', prev: '*', next: 'multiline-const' },
      ],
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ['app/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  }
)
