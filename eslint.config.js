import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off'
    }
  },
  {
    ignores: ['node_modules/**', '.next/**', 'dist/**', 'coverage/**', '*.config.*']
  }
];