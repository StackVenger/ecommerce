/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: ['.eslintrc.js'],
  extends: ['@ecommerce/eslint-config'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
