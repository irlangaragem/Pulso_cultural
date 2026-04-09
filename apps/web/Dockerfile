FROM node:18-alpine AS base

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
RUN npm install

COPY . .

# Build the application
RUN npm run build --workspace=web

# Production image - using nginx to serve static files
FROM nginx:alpine AS runner

COPY --from=base /app/apps/web/dist /usr/share/nginx/html
# Copy custom nginx config if needed for SPA routing
# COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
