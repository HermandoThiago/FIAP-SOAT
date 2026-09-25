import { z } from 'zod';

// Configuração 12-factor validada na subida (visao-geral.md §6; estrutura-do-repositorio.md §2 — .env.example).
// Falha rápida: a aplicação não sobe com variável ausente ou inválida.
export const APP_ENVS = ['dev', 'test', 'prod'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const envSchema = z.object({
  APP_ENV: z.enum(APP_ENVS).default('dev'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z
    .string()
    .min(1)
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL must be a PostgreSQL connection string'),
  // ADR-004: segredo HS256 com pelo menos 32 bytes.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must have at least 32 characters'),
  JWT_EXPIRES_MIN: z.coerce.number().int().positive().default(60),
  // RF-062 / ADR-004: usuário MANAGER criado na subida a partir do ambiente.
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must have at least 8 characters'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n  - ${issues.join('\n  - ')}`);
  }
  return result.data;
}
