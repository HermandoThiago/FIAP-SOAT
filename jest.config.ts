import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Path aliases (e.g. the ones added by `nest g library`) live in tsconfig.json,
// so they are read from there instead of being duplicated here.
const { config: tsconfig } = ts.readConfigFile(
  './tsconfig.json',
  ts.sys.readFile,
);
const paths = tsconfig?.compilerOptions?.paths ?? {};

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    // o client gerado pelo Prisma importa './x.js' (arquivos .ts)
    '^(\\.{1,2}/.*)\\.js$': '$1',
    ...pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/generated/**', // client gerado pelo Prisma
    '!src/scripts/**', // seed
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/index.ts',
    '!src/**/domain/entities/**', // classes de dados só com decorators: sem comportamento a cobrir
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  // Gate do CLAUDE.md: >= 80 % (linhas e branches) em domain/ + services/ dos módulos críticos
  coverageThreshold: {
    global: { lines: 80, branches: 80 },
    ...Object.fromEntries(
      [
        'service-orders/domain',
        'service-orders/services',
        'catalog/services',
      ].map((dir) => [`./src/modules/${dir}/`, { lines: 80, branches: 80 }]),
    ),
  },
  testEnvironment: 'node',
};

export default config;
