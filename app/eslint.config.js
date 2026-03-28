import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'android/**/build/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/ui/**/*.{ts,tsx}', 'src/*/ui/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/application/use*'],
          message: 'UI components must not import application hooks directly. Use infrastructure containers.',
        }],
      }],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/account/**', '**/ledger/**', '**/taxonomy/**', '**/imports/**'],
            message: 'shared must remain domain-neutral and cannot depend on bounded contexts.',
          },
          {
            group: ['**/application/use*'],
            message: 'shared UI/components must not import application hooks directly.',
          },
        ],
      }],
    },
  },
])
