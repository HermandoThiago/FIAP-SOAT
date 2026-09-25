import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 (E-17): a URL do banco e o comando de seed ficam aqui, não no schema.prisma.
// O seed só popula dados em APP_ENV=dev (modelo-de-dados.md §5/§6).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
    // Opcional: banco-sombra fixo para `migrate dev` e para o drift check (prisma/README.md); sem ele o Prisma cria um
    // banco temporário (exige CREATEDB).
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
