module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': 'warn', // Relax unused variables to a warning
    'no-console': 'off', // Allow console.log for debugging
  },
};