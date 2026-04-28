/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ['@ecommerce/eslint-config/nest'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  overrides: [
    {
      // Spec files and JS config files are excluded from tsconfig.json, so
      // type-aware lint cannot parse them. Drop the project setting and use
      // the official disable-type-checked preset to turn off rules that
      // require type info.
      files: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/*.js', '**/*.cjs', '**/*.mjs'],
      extends: ['plugin:@typescript-eslint/disable-type-checked'],
      env: { node: true },
      parserOptions: { project: null },
    },
  ],
};
