FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=base /app/dist /usr/share/nginx/html

# Suppress verbose nginx logs — only critical errors will show
RUN echo 'error_log /dev/null crit;' > /etc/nginx/conf.d/logging.conf

# Create an Nginx template to handle dynamic ports and React Router (try_files)
RUN mkdir -p /etc/nginx/templates && \
    echo 'server { \
      listen ${PORT}; \
      server_name _; \
      root /usr/share/nginx/html; \
      index index.html; \
      access_log off; \
      location / { \
        try_files $uri $uri/ /index.html; \
      } \
    }' > /etc/nginx/templates/default.conf.template

# Ensure Railway's required PORT is set if missing
ENV PORT=80

EXPOSE ${PORT}
CMD ["nginx", "-g", "daemon off;"]
