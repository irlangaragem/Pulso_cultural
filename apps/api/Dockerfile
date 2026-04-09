FROM node:18-alpine AS base

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
RUN npm install

COPY . .

# Generate Prisma Client
RUN cd apps/api && npx prisma generate

# Build the application
RUN npm run build --workspace=api

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/package.json ./apps/api/
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3333

CMD ["node", "apps/api/dist/server.js"]
