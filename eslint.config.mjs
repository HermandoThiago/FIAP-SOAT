// ESLint 9 (flat config) — TypeScript com regras type-aware + Prettier + convenções de teste (ADR-006).
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import jest from 'eslint-plugin-jest';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'reports/**', 'node_modules/**', 'src/generated/**', '*.mjs', '*.cjs', '*.js'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Testes (ADR-006): it('should <resultado> when <condição>'), em inglês.
    files: ['test/**/*.ts'],
    ...jest.configs['flat/recommended'],
    rules: {
      ...jest.configs['flat/recommended'].rules,
      'jest/valid-title': [
        'error',
        { mustMatch: { it: ['^should .+ when .+', 'Use it("should <result> when <condition>")'] } },
      ],
      'jest/expect-expect': ['error', { assertFunctionNames: ['expect', 'request.**.expect'] }],
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    // Steps do Cucumber e scripts: sem regras específicas de Jest.
    files: ['test/bdd/**/*.ts', 'scripts/**/*.ts', 'prisma/**/*.ts'],
    rules: {
      'jest/valid-title': 'off',
      'jest/expect-expect': 'off',
      'jest/no-standalone-expect': 'off',
    },
  },
);
