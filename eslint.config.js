import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Project convention: the `—` character is banned everywhere in favour of `-`.
 * These selectors cover string literals, template chunks and JSX text. Comments
 * are covered separately by `src/test/conventions.test.ts`, which greps the tree.
 */
const noEmDash = [
  'error',
  {
    selector: 'Literal[value=/—/]',
    message: 'Do not use the — character. Use - or _ instead.',
  },
  {
    selector: 'TemplateElement[value.raw=/—/]',
    message: 'Do not use the — character. Use - or _ instead.',
  },
  {
    selector: 'JSXText[value=/—/]',
    message: 'Do not use the — character. Use - or _ instead.',
  },
];

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules'],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-syntax': noEmDash,
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // The storage layer is the only place allowed to touch persistence
      // primitives directly; everything else must go through AppStorage.
      'no-restricted-globals': ['error', { name: 'localStorage', message: 'Use AppStorage.' }],
    },
  },
  {
    // Plain JS config files are not part of any tsconfig project, so type-aware
    // rules cannot run on them.
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    // Config and tooling files run in Node.
    files: ['*.config.ts', 'src/test/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
);
