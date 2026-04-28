FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# Instala dependências primeiro (camada cacheável)
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

# Gera o Prisma Client (obrigatório antes do build TypeScript)
RUN npx prisma generate

# Copia o restante e compila
COPY . .
RUN npm run build

# ── Runner (imagem final enxuta) ──────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/dist        ./dist
COPY --from=base /app/prisma      ./prisma

EXPOSE 3333

# db push sincroniza schema → servidor sobe
# Erros de push são logados mas não travam o servidor
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
