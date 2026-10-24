import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: [
    'oxc',
    'jsdoc',
    'node',
    'import',
    'eslint',
    'react',
    'unicorn',
    'promise',
    'typescript'
  ],
  options: {
    typeCheck: true,
    typeAware: true,
    reportUnusedDisableDirectives: 'warn'
  },
  env: {
    node: true,
    es2024: true,
    browser: true,
    'shared-node-browser': true
  },
  rules: {
    'sort-keys': 'off',
    'react/rules-of-hooks': 'error',
    'react/only-export-components': ['warn', { allowConstantExport: true }]
  },
  overrides: [
    {
      files: ['server/vite-json.ts'],
      rules: {
        // Connect middleware must forward async failures to its next(error) callback.
        'promise/no-callback-in-promise': 'off'
      }
    }
  ],
  ignorePatterns: ['**/_/**', '.agents', '**/dist/**', '**/node_modules/**']
})
