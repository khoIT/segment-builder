/** Shared eslint preset for Bedrock packages. Lightweight by design — phases
 *  that need stricter rules (TypeScript, react-hooks) extend this base. */
module.exports = {
  root: false,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
  ignorePatterns: ['dist', 'node_modules', '.turbo', '*.config.js'],
};
