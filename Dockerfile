# Imagem da API (seguranca.md "Dockerfile seguro"; ADR-007: hadolint + Trivy image no CI).
# Multi-stage deps → build → prune → runtime: tag fixa por major (nunca latest), usuário não-root, sem segredos,
# HEALTHCHECK em /health. O estágio `build` também é a imagem do serviço `migrate` do docker-compose.yml
# (precisa da CLI prisma, do ts-node e de prisma/ + prisma.config.ts).

# ───────────── deps: todas as dependências, instalação reprodutível a partir do package-lock.json ─────────────
FROM node:22-alpine AS deps
# Telemetria/checagem de versão da CLI do Prisma desligada (generate, migrate deploy e db seed rodam offline).
ENV CHECKPOINT_DISABLE=1
WORKDIR /app
# /app passa a pertencer ao usuário `node` (uid 1000): npm ci, prisma generate e nest build rodam sem root.
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
# Sem build tools nem apk add: bcrypt 6 traz prebuilds musl; @prisma/engines baixa o schema engine (migrate).
RUN npm ci --no-audit --no-fund

# ───────────── build: cliente Prisma gerado + compilação (nest build) ─────────────
FROM deps AS build
COPY --chown=node:node tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src
# prisma.config.ts resolve DATABASE_URL ao carregar, mas `prisma generate` não conecta: placeholder sem credenciais.
RUN DATABASE_URL=postgresql://localhost:5432/placeholder npm run prisma:generate \
    && npm run build

# ───────────── prune: só o que a API usa em produção ─────────────
FROM build AS prune
# --omit=optional: `prisma` (CLI) e `typescript` são peerOptional de @prisma/client e não servem em runtime;
# a única optional de produção é pg-cloudflare (só para Cloudflare Workers). ~160 MB em vez de ~430 MB.
RUN npm prune --omit=dev --omit=optional --no-audit --no-fund

# ───────────── runtime: imagem final enxuta, não-root ─────────────
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node --from=prune /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/package.json ./package.json
USER node
EXPOSE 8080
# Liveness com o wget da busybox (a imagem não tem curl): GET /health (health.controller.ts; visao-geral.md §6).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["wget", "--quiet", "--spider", "http://127.0.0.1:8080/health"]
CMD ["node", "dist/main.js"]
