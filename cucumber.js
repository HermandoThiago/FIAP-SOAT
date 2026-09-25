// Cucumber-js (ADR-006): cenários em português (# language: pt) executados contra a API real sobre o banco de teste.
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['test/bdd/support/**/*.ts', 'test/bdd/steps/**/*.ts'],
    paths: ['test/bdd/features/**/*.feature'],
    format: ['progress', 'html:reports/bdd/report.html'],
    formatOptions: { snippetInterface: 'async-await' },
    strict: true,
  },
};
