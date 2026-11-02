# syntax=docker/dockerfile:1

# ---- deps: dependências completas (inclui devDependencies, usadas no build e nas migrações) ----
FROM node:22-bookworm-slim AS deps
ENV HUSKY=0
WORKDIR /app
# openssl: o motor de migração do Prisma detecta a versão da libssl (usado só nos estágios build/migrate)
# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable && corepack prepare pnpm@10.15.1 --activate
COPY package.json pnpm-lock.yaml ./
# O postinstall roda `prisma generate`, que lê o schema e a config: copiados antes de instalar.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile

# ---- build: gera o client do Prisma e compila o TypeScript para dist/ ----
FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm exec nest build

# ---- migrate: mesma base do build; aplica as migrações e o seed (usado pelo docker compose) ----
FROM build AS migrate
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec tsx src/scripts/seed.ts"]

# ---- prod-deps: só as dependências de produção ----
FROM node:22-bookworm-slim AS prod-deps
ENV HUSKY=0
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
COPY package.json pnpm-lock.yaml ./
# --ignore-scripts: o postinstall (prisma generate) não é necessário; o client já está compilado em dist/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# ---- runtime: imagem final, sem devDependencies e sem código-fonte, usuário não-root ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 3001
# /docs (Swagger) é público e não exige banco: serve de sonda de vida da API.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/docs').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main"]
