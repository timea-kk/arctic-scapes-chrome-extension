import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ['node_modules/', 'coverage/'],
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
