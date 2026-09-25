/* eslint-disable */
// Regras de dependência da arquitetura (docs/04-arquitetura/estrutura-do-repositorio.md §4 — ADR-003, camadas
// clássicas dentro de cada módulo por contexto). Roda no CI: `npm run depcruise`.
//
// 1. domain/ não importa services/, repositories/, controllers/, @nestjs/* nem o cliente do Prisma.
// 2. services/ nunca importa controllers/ (nem dto/).
// 3. controllers/ e dto/ nunca importam repositories/.
// 4. repositories/ nunca importa services/ nem controllers/.
// 5. Um módulo só conhece outro pelo serviço que ele exporta (services/) — nunca domain/, repositories/,
//    controllers/ ou dto/ alheios.
// 6. shared/ é pequeno e estável: não conhece os módulos; a única exceção são os guards de shared/auth, que usam os
//    serviços exportados pelo identity (AuthService, TrackingTokenService — ADR-004/011, glossário §6).

const MODULE = '^src/modules/([^/]+)/';
// Dependências npm aparecem com o caminho resolvido (node_modules/...); o cliente do Prisma é gerado em src/generated.
const NEST = '^node_modules/@nestjs/';
const PRISMA_CLIENT = '^node_modules/@prisma/|^src/generated/';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-no-framework',
      severity: 'error',
      comment: 'domain/ é TypeScript puro: sem @nestjs/*, sem Prisma (ADR-003; estrutura §4.1).',
      from: { path: '^src/(modules/[^/]+|shared)/domain/' },
      to: { path: `${NEST}|${PRISMA_CLIENT}` },
    },
    {
      name: 'domain-no-upper-layers',
      severity: 'error',
      comment: 'domain/ não importa services/, repositories/, controllers/ nem dto/ (estrutura §4.1).',
      from: { path: '^src/(modules/[^/]+|shared)/domain/' },
      to: { path: '^src/(modules/[^/]+|shared)/(services|repositories|controllers|dto|prisma|http|auth|events)/' },
    },
    {
      name: 'services-no-presentation',
      severity: 'error',
      comment: 'services/ nunca importa controllers/ nem dto/ (estrutura §4.2).',
      from: { path: `${MODULE}services/` },
      to: { path: '^src/modules/[^/]+/(controllers|dto)/' },
    },
    {
      name: 'controllers-no-repositories',
      severity: 'error',
      comment:
        'controller nunca chama repositório: controllers/ e dto/ só importam services/ e domain/ (estrutura §4.3).',
      from: { path: `${MODULE}(controllers|dto)/` },
      to: { path: '^src/modules/[^/]+/repositories/' },
    },
    {
      name: 'controllers-no-prisma',
      severity: 'error',
      comment: 'A camada de apresentação não conhece o Prisma (estrutura §4.3).',
      from: { path: `${MODULE}(controllers|dto)/` },
      to: { path: `${PRISMA_CLIENT}|^src/shared/prisma/` },
    },
    {
      name: 'repositories-no-upper-layers',
      severity: 'error',
      comment: 'repositories/ importa domain/ e shared/prisma; nunca services/ nem controllers/ (estrutura §4.4).',
      from: { path: `${MODULE}repositories/` },
      to: { path: '^src/modules/[^/]+/(services|controllers|dto)/' },
    },
    {
      name: 'modules-only-via-exported-services',
      severity: 'error',
      comment:
        'Um módulo só conhece outro pelo serviço de aplicação exportado — nunca domain/, repositories/, controllers/ ou dto/ alheios (ADR-003; estrutura §4.5).',
      from: { path: MODULE },
      to: { path: '^src/modules/([^/]+)/(domain|repositories|controllers|dto)/', pathNot: '^src/modules/$1/' },
    },
    {
      name: 'shared-does-not-know-modules',
      severity: 'error',
      comment:
        'shared/ não importa os módulos (estrutura §4.6); exceção documentada: guards de shared/auth → serviços exportados do identity.',
      from: { path: '^src/shared/', pathNot: '^src/shared/auth/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'shared-auth-only-identity-services',
      severity: 'error',
      comment:
        'Os guards só usam AuthService/TrackingTokenService exportados pelo identity (ADR-004/011, glossário §6).',
      from: { path: '^src/shared/auth/' },
      to: { path: '^src/modules/', pathNot: '^src/modules/identity/services/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Dependências circulares escondem acoplamento entre camadas.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Arquivo sem uso: sem abstrações sem uso (prompt 02).',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
          '\\.d\\.ts$',
          '^src/generated/',
          '^src/main\\.ts$',
          '(^|/)index\\.ts$',
        ],
      },
      to: {},
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'no-duplicate-dep-types',
      severity: 'warn',
      from: {},
      to: { moreThanOneDependencyType: true, dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment: 'Código de produção não depende de devDependencies.',
      from: { path: '^src/', pathNot: '\\.spec\\.ts$' },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'], pathNot: ['node_modules/@types/'] },
    },
    {
      name: 'not-to-deprecated',
      severity: 'warn',
      from: {},
      to: { dependencyTypes: ['deprecated'] },
    },
  ],
  options: {
    // node_modules e o cliente gerado não são percorridos, mas as arestas até eles ficam visíveis para as regras acima.
    doNotFollow: { path: ['node_modules', 'src/generated'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/(?:@[^/]+/[^/]+|[^/]+)' },
      text: { highlightFocused: true },
    },
  },
};
