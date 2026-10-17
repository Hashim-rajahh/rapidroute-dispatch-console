import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.browser } }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node, ...globals.jest } }
  },
  {
    files: ['scripts/**/*.js', 'eslint.config.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node } }
  }
];
