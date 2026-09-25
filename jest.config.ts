import { existsSync, readdirSync } from 'node:fs';

import type { Config } from 'jest';

// Dois projetos (ADR-006): unitários (domínio e services com fakes, sem banco) e integração (Testcontainers + supertest).
// `npm test` roda só os unitários; `npm run test:cov` roda os dois e aplica o gate de cobertura por pasta.
const tsTransform: Config['transform'] = {
  '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: { exclude: ['src/generated/**'] } }],
};

// Gate da ADR-006: ≥ 80 % de linhas e branches em domain/ + services/ dos módulos críticos (estrategia-de-testes.md §4).
// O Jest falha com "Coverage data not found" para pasta sem nenhum arquivo, então uma pasta ainda vazia entra no gate
// automaticamente no primeiro arquivo .ts que chegar (prompts 03 e 04) — não é preciso mexer aqui.
const CRITICAL_FOLDERS = [
  'src/modules/service-orders/domain',
  'src/modules/service-orders/services',
  'src/modules/catalog/domain',
  'src/modules/catalog/services',
];

function hasSourceFiles(folder: string): boolean {
  if (!existsSync(folder)) {
    return false;
  }
  return readdirSync(folder, { recursive: true, encoding: 'utf8' }).some(
    (file) => file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.d.ts'),
  );
}

const coverageThreshold = Object.fromEntries(
  CRITICAL_FOLDERS.filter(hasSourceFiles).map((folder) => [`./${folder}/`, { lines: 80, branches: 80 }]),
) as NonNullable<Config['coverageThreshold']>;

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      rootDir: '.',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
      transform: tsTransform,
    },
    {
      displayName: 'integration',
      rootDir: '.',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      transform: tsTransform,
      globalSetup: '<rootDir>/test/support/global-setup.ts',
      globalTeardown: '<rootDir>/test/support/global-teardown.ts',
      testTimeout: 120_000,
    },
  ],
  // v8: caminhos corretos no relatório com ts-jest + Jest 30 (o provider babel prefixa os arquivos com "file:").
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/generated/**',
    '!src/**/*.module.ts',
    '!src/**/dto/**',
    '!src/**/controllers/**',
    '!src/**/repositories/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coverageThreshold,
};

export default config;
